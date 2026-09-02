import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'

const fixtures = [
  ['FIX-1-401', 'Válida, novo event_id'],
  ['FIX-1-402', 'Duplicada, mesmo event_id e mesmo conteúdo'],
  ['FIX-1-403', 'Conflito, mesmo event_id com conteúdo divergente'],
  ['FIX-1-404', 'Inválida, campo obrigatório ausente'],
  ['FIX-1-405', 'Destino indisponível simulado'],
]

const hashPayload = (value) => {
  const raw = JSON.stringify(value)
  let hash = 7
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 33 + raw.charCodeAt(i)) >>> 0
  return `${raw.length}-${hash}`
}

export default function IntegrationHarness() {
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const loadExisting = async (eventId) => {
    try {
      return await pb.collection('integration_events').getFirstListItem(`event_id = "${eventId}"`)
    } catch (err) {
      if (err.status === 404) return null
      throw err
    }
  }

  const saveEvent = async ({ event, status, errorCode = '', lastState = 'nenhum', nextAction }) => {
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

  const saveFallback = async (event, errorCode, lastState, nextAction) => {
    await pb.collection('integration_fallbacks').create({
      event_id: event.event_id,
      source_ref: event.source_ref,
      error_code: errorCode,
      last_confirmed_state: lastState,
      responsible: pb.authStore.record.id,
      next_action: nextAction,
      status: 'aberta',
    })
  }

  const runFixture = async (fixtureId) => {
    setRunning(true)
    setError('')
    try {
      let event = {
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
      await saveEvent({
        event,
        status: 'processed',
        lastState: 'processado',
        nextAction: 'Nenhuma; evento processado em homologação',
      })
      await pb
        .collection('clientes')
        .create({
          nome: event.name,
          telefone_principal: 'não informado',
          situacao: 'ativo',
          natureza_cadastral: 'pessoa_fisica',
          classificacao_comercial: 'cliente_padrao',
          origem_cliente: 'outro',
          referencia_origem: 'fixture de homologação',
          source_ref: event.source_ref,
        })
      setResults((items) => [
        ...items.filter((item) => item.fixture_id !== fixtureId),
        { fixture_id: fixtureId, result: 'processed', wrote_canonical: true },
      ])
    } catch (err) {
      setError(err.message || 'Não foi possível executar a fixture.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="bg-[#3D2314] text-white p-4">
        <div className="container mx-auto flex justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#DCC39E]">Nexus Emília</p>
            <h1 className="text-2xl font-semibold">Harness de integração</h1>
          </div>
          <Button
            variant="outline"
            className="text-white border-white"
            onClick={() => navigate('/')}
          >
            Voltar
          </Button>
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Fixtures de homologação</CardTitle>
            <p className="text-sm text-gray-600">
              Modo de teste, acesso exclusivo do Administrador. Nenhuma conexão externa é ativada.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <p role="alert" className="text-[#7A2E2E]">
                {error}
              </p>
            )}
            {fixtures.map(([id, label]) => (
              <div key={id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{id}</p>
                  <p className="text-sm text-gray-600">{label}</p>
                </div>
                <Button disabled={running} onClick={() => runFixture(id)}>
                  Executar
                </Button>
              </div>
            ))}
            <div className="pt-4 space-y-2">
              {results.map((result) => (
                <div key={result.fixture_id + result.result} className="rounded border p-3">
                  <b>{result.fixture_id}</b>: {result.result} · escrita canônica:{' '}
                  {result.wrote_canonical ? 'sim' : 'não'}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
