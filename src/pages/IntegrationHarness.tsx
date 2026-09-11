import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import AppShell from '@/components/AppShell'
import { ArrowLeft, Play, ShieldAlert } from 'lucide-react'

const fixtures = [
  ['FIX-1-401', 'Válida, novo event_id'],
  ['FIX-1-402', 'Duplicada, mesmo event_id e mesmo conteúdo'],
  ['FIX-1-403', 'Conflito, mesmo event_id com conteúdo divergente'],
  ['FIX-1-404', 'Inválida, campo obrigatório ausente'],
  ['FIX-1-405', 'Destino indisponível simulado'],
]

const hashPayload = (value: any) => {
  const raw = JSON.stringify(value)
  let hash = 7
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 33 + raw.charCodeAt(i)) >>> 0
  return `${raw.length}-${hash}`
}

export default function IntegrationHarness() {
  const navigate = useNavigate()
  const [results, setResults] = useState<any[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const loadExisting = async (eventId: string) => {
    try {
      return await pb.collection('integration_events').getFirstListItem(`event_id = "${eventId}"`)
    } catch (err: any) {
      if (err.status === 404) return null
      throw err
    }
  }

  // Eventos de integração são append-only (updateRule null): reexecução não reescreve
  // registro existente, apenas devolve o estado já confirmado.
  const saveEvent = async ({
    event,
    status,
    errorCode = '',
    lastState = 'nenhum',
    nextAction,
  }: {
    event: any
    status: string
    errorCode?: string
    lastState?: string
    nextAction?: string
  }) => {
    const existing = await loadExisting(event.event_id)
    if (existing) return existing
    return pb.collection('integration_events').create({
      event_id: event.event_id,
      payload_hash: hashPayload(event),
      event_type: 'customer.created',
      payload_version: '1.0',
      source_system: 'fixture',
      external_record_id: `ext-${event.event_id}`,
      source_ref: event.source_ref,
      status,
      error_code: errorCode,
      last_confirmed_state: lastState,
      responsible: pb.authStore.record.id,
      next_action: nextAction,
      trace_id: `trace-${event.event_id}`,
      test_mode: true,
    })
  }

  // Fila de fallback é a "ocorrência" reconciliável: permite atualização para registrar
  // reexecução e reprocessamento com o mesmo event_id.
  const saveFallback = async (
    event: any,
    errorCode: string,
    lastState: string,
    nextAction: string,
  ) => {
    const existing = await pb
      .collection('integration_fallbacks')
      .getFirstListItem(`event_id = "${event.event_id}"`)
      .catch((err) => {
        if (err.status === 404) return null
        throw err
      })
    const payload = {
      event_id: event.event_id,
      source_ref: event.source_ref,
      error_code: errorCode,
      last_confirmed_state: lastState,
      responsible: pb.authStore.record.id,
      next_action: nextAction,
      status: 'aberta',
    }
    if (existing) return pb.collection('integration_fallbacks').update(existing.id, payload)
    return pb.collection('integration_fallbacks').create(payload)
  }

  const runFixture = async (fixtureId: string) => {
    setRunning(true)
    setError('')
    try {
      let event: any = {
        event_id: 'fixture-401',
        name: 'Cliente Fixture 401',
        source_ref: 'fixture:customer:401',
      }
      if (fixtureId === 'FIX-1-404')
        event = { event_id: 'fixture-404', name: '', source_ref: 'fixture:customer:404' }
      if (fixtureId === 'FIX-1-405')
        event = {
          event_id: 'fixture-405',
          name: 'Cliente Fixture 405',
          source_ref: 'fixture:customer:405',
        }
      if (fixtureId === 'FIX-1-402' || fixtureId === 'FIX-1-403') {
        const original = await loadExisting('fixture-401')
        if (!original) throw new Error('Execute primeiro a fixture FIX-1-401.')
        event = {
          event_id: 'fixture-401',
          name: fixtureId === 'FIX-1-403' ? 'Cliente Fixture 401 alterado' : 'Cliente Fixture 401',
          source_ref: 'fixture:customer:401',
        }
      }

      const existing = await loadExisting(event.event_id)
      if (fixtureId === 'FIX-1-404') {
        await saveEvent({
          event,
          status: 'rejected',
          errorCode: 'schema_required_field',
          nextAction: 'Corrigir payload e reenviar.',
        })
        await saveFallback(event, 'schema_required_field', 'nenhum', 'Corrigir payload e reenviar.')
        setResults((items) => [
          ...items.filter((item) => item.fixture_id !== fixtureId),
          { fixture_id: fixtureId, result: 'rejected', wrote_canonical: false },
        ])
        return
      }
      if (fixtureId === 'FIX-1-405') {
        await saveEvent({
          event,
          status: 'manual_reconciliation',
          errorCode: 'destination_timeout',
          nextAction: 'Atendimento deve reconciliar por source_ref.',
        })
        await saveFallback(
          event,
          'destination_timeout',
          'nenhum',
          'Atendimento deve reconciliar por source_ref.',
        )
        setResults((items) => [
          ...items.filter((item) => item.fixture_id !== fixtureId),
          { fixture_id: fixtureId, result: 'manual_reconciliation', wrote_canonical: false },
        ])
        return
      }
      if (existing) {
        if (existing.payload_hash === hashPayload(event)) {
          setResults((items) => [
            ...items.filter((item) => item.fixture_id !== fixtureId),
            { fixture_id: fixtureId, result: 'duplicate', wrote_canonical: false },
          ])
          return
        }
        await saveFallback(
          event,
          'integration_conflict',
          existing.status,
          'Gestão deve comparar os payloads.',
        )
        setResults((items) => [
          ...items.filter((item) => item.fixture_id !== fixtureId),
          { fixture_id: fixtureId, result: 'integration_conflict', wrote_canonical: false },
        ])
        return
      }
      // Novo event_id: cria evento e vínculo canônico, reutilizando cliente por source_ref
      await saveEvent({
        event,
        status: 'processed',
        lastState: 'processado',
        nextAction: 'Nenhuma; evento processado em homologação',
      })
      const existingCliente = await pb
        .collection('clientes')
        .getFirstListItem(`source_ref = "${event.source_ref}"`)
        .catch((err) => {
          if (err.status === 404) return null
          throw err
        })
      if (!existingCliente) {
        await pb.collection('clientes').create({
          nome: event.name,
          telefone_principal: 'não informado',
          situacao: 'ativo',
          natureza_cadastral: 'pessoa_fisica',
          classificacao_comercial: 'cliente_padrao',
          origem_cliente: 'outro',
          referencia_origem: 'fixture de homologação',
          source_ref: event.source_ref,
        })
      }
      setResults((items) => [
        ...items.filter((item) => item.fixture_id !== fixtureId),
        { fixture_id: fixtureId, result: 'processed', wrote_canonical: true },
      ])
    } catch (err: any) {
      setError(err.message || 'Não foi possível executar a fixture.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <AppShell
      title="Harness de Integração"
      subtitle="Ambiente de homologação técnica e testes de idempotência"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] text-xs rounded-xl flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            Voltar ao painel
          </Button>

          <span className="text-xs font-serif italic text-[#B08A3E] flex items-center gap-1">
            <ShieldAlert size={14} />
            Ambiente de Homologação
          </span>
        </div>

        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#E8DEC8]/50">
            <CardTitle className="font-serif text-lg font-semibold text-[#5C4A32]">
              Fixtures de Teste
            </CardTitle>
            <p className="text-xs text-[#8A7A66]">
              Modo de teste, acesso restrito ao Administrador. Nenhuma conexão externa é ativada.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {error && (
              <p
                role="alert"
                className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200"
              >
                {error}
              </p>
            )}

            <div className="divide-y divide-[#E8DEC8]/60">
              {fixtures.map(([id, label]) => (
                <div key={id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#5C4A32]">{id}</p>
                    <p className="text-xs text-[#8A7A66]">{label}</p>
                  </div>
                  <Button
                    disabled={running}
                    onClick={() => runFixture(id)}
                    className="bg-[#5C4A32] hover:bg-[#473926] text-[#FDFAF5] text-xs rounded-xl flex items-center gap-1"
                  >
                    <Play size={12} /> Executar
                  </Button>
                </div>
              ))}
            </div>

            {results.length > 0 && (
              <div className="pt-4 space-y-2 border-t border-[#E8DEC8]">
                <h4 className="text-xs font-semibold text-[#5C4A32] uppercase tracking-wider">
                  Resultados da sessão
                </h4>
                {results.map((result) => (
                  <div
                    key={result.fixture_id + result.result}
                    className="rounded-xl border border-[#E8DEC8] bg-[#FBF7F0] p-3 text-xs text-[#5C4A32]"
                  >
                    <b className="font-mono text-[#B08A3E]">{result.fixture_id}</b>: {result.result}{' '}
                    · escrita canônica: {result.wrote_canonical ? 'sim' : 'não'}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
