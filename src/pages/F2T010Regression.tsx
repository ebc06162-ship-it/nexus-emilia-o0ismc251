import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, Play, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppShell from '@/components/AppShell'
import pb from '@/lib/pocketbase/client'

const FIXTURE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

type Resultado = {
  id: string
  titulo: string
  ok: boolean
  detalhe: string
}

const erroTexto = (err: any) => err?.response?.message || err?.message || 'Falha não identificada.'

export default function F2T010Regression() {
  const navigate = useNavigate()
  const [propostas, setPropostas] = useState<any[]>([])
  const [pedidos, setPedidos] = useState<any[]>([])
  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const [propostasResult, pedidosResult, pagamentosResult] = await Promise.all([
        pb.collection('propostas').getList(1, 100, {
          filter: 'status = "aprovada"',
          sort: '-created',
        }),
        pb.collection('pedidos').getList(1, 100, { sort: '-created' }),
        pb.collection('pagamentos').getList(1, 100, { sort: '-created' }),
      ])
      setPropostas(propostasResult.items)
      setPedidos(pedidosResult.items)
      setPagamentos(pagamentosResult.items)
    } catch (err: any) {
      setErro(erroTexto(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const registrar = (resultado: Resultado) => {
    setResultados((atuais) => [...atuais.filter((item) => item.id !== resultado.id), resultado])
  }

  const executar = async (id: string, titulo: string, fn: () => Promise<string>) => {
    setRunning(true)
    setErro('')
    try {
      const detalhe = await fn()
      registrar({ id, titulo, ok: true, detalhe })
    } catch (err: any) {
      registrar({ id, titulo, ok: false, detalhe: erroTexto(err) })
    } finally {
      setRunning(false)
      await carregar()
    }
  }

  const propostaComPedido = () => {
    const proposta = propostas.find((item) => item.pedido_id)
    if (!proposta)
      throw new Error('Nenhuma proposta aprovada com pedido convertido foi encontrada.')
    return proposta
  }

  const pedidoFixture = () => {
    const pedido = pedidos.find((item) => item.status_comercial === 'aprovado')
    if (!pedido) throw new Error('Nenhum pedido aprovado de homologação foi encontrado.')
    return pedido
  }

  const prepararPagamento = async (pedidoId: string) =>
    pb.send(`/backend/v1/pedidos/${pedidoId}/pagamentos`, {
      method: 'POST',
      body: {
        forma_pagamento: 'pix',
        valor_previsto: 0.01,
        vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        motivo: 'Fixture F2-T010; nenhum valor real.',
      },
    })

  const enviarPngFixture = async (pagamentoId: string) => {
    const bytes = Uint8Array.from(atob(FIXTURE_PNG_BASE64), (char) => char.charCodeAt(0))
    const arquivo = new File([bytes], 'f2-t010-fixture.png', { type: 'image/png' })
    const form = new FormData()
    form.append('arquivos', arquivo)
    return pb.send(`/backend/v1/pagamentos/${pagamentoId}/comprovantes`, {
      method: 'POST',
      body: form,
    })
  }

  const executarIdempotencia = () =>
    executar('idempotencia', 'Conversão repetida', async () => {
      const proposta = propostaComPedido()
      const antes = await pb.collection('auditoria_pedidos').getList(1, 100, {
        filter: `proposta_id = "${proposta.id}" && tipo_evento = "tentativa_conversao"`,
      })
      const resposta: any = await pb.send(`/backend/v1/propostas/${proposta.id}/resposta`, {
        method: 'POST',
        body: { acao: 'aprovar', motivo: 'Fixture F2-T010 idempotência.' },
      })
      const depois = await pb.collection('auditoria_pedidos').getList(1, 100, {
        filter: `proposta_id = "${proposta.id}" && tipo_evento = "tentativa_conversao"`,
      })
      if (!resposta.idempotente || resposta.pedido_id !== proposta.pedido_id) {
        throw new Error('A repetição não reutilizou exatamente o pedido existente.')
      }
      if (depois.totalItems !== antes.totalItems + 1) {
        throw new Error('A tentativa repetida não gerou exatamente um evento de auditoria.')
      }
      return `PASSOU: pedido ${resposta.pedido_id} reutilizado e auditoria incrementada.`
    })

  const executarDivergencia = () =>
    executar('divergencia', 'Divergência financeira', async () => {
      const pedido = pedidoFixture()
      const plano: any = await prepararPagamento(pedido.id)
      const pagamentoId = plano.pagamento_id
      await enviarPngFixture(pagamentoId)
      const decisao: any = await pb.send(`/backend/v1/pagamentos/${pagamentoId}/decisao`, {
        method: 'POST',
        body: { acao: 'divergente', motivo: 'Fixture F2-T010: valor não identificado.' },
      })
      if (decisao.status_pagamento !== 'divergente' || !decisao.pendencia_criada) {
        throw new Error('A divergência não voltou ao Atendimento com pendência.')
      }
      const pendencias = await pb.collection('pendencias').getList(1, 100, {
        filter: `origem = "fila_financeira" && valor_atual = "${pagamentoId}"`,
      })
      if (!pendencias.totalItems) throw new Error('Pendência financeira não encontrada.')
      return `PASSOU: pagamento ${pagamentoId} divergente; pendência criada para Atendimento.`
    })

  const executarFormatoInvalido = () =>
    executar('formato-invalido', 'Formato de comprovante', async () => {
      const pedido = pedidoFixture()
      const plano: any = await prepararPagamento(pedido.id)
      const form = new FormData()
      const arquivo = new File(['fixture'], 'f2-t010-invalido.txt', { type: 'text/plain' })
      form.append('arquivos', arquivo)
      try {
        await pb.send(`/backend/v1/pagamentos/${plano.pagamento_id}/comprovantes`, {
          method: 'POST',
          body: form,
        })
        throw new Error('O backend aceitou formato de arquivo inválido.')
      } catch (err: any) {
        if (err?.status !== 400 && err?.response?.status !== 400) throw err
      }
      const pagamento = await pb.collection('pagamentos').getOne(plano.pagamento_id)
      if (pagamento.status !== 'aguardando_pagamento') {
        throw new Error('Pagamento mudou de status após arquivo inválido.')
      }
      return 'PASSOU: formato inválido rejeitado sem alterar o pagamento.'
    })

  const executarPagamentoConfirmado = () =>
    executar('pagamento-confirmado', 'Pagamento confirmado imutável', async () => {
      const pedido = pedidoFixture()
      const plano: any = await prepararPagamento(pedido.id)
      await enviarPngFixture(plano.pagamento_id)
      await pb.send(`/backend/v1/pagamentos/${plano.pagamento_id}/decisao`, {
        method: 'POST',
        body: { acao: 'conferir', motivo: 'Fixture F2-T010: conferência explícita.' },
      })
      try {
        await enviarPngFixture(plano.pagamento_id)
        throw new Error('O backend aceitou novo comprovante após confirmação.')
      } catch (err: any) {
        if (err?.status !== 400 && err?.response?.status !== 400) throw err
      }
      return 'PASSOU: pagamento confirmado recusou novo comprovante.'
    })

  return (
    <AppShell
      title="Regressão F2-T010"
      subtitle="Homologação comercial e financeira, sem produção ou integração externa"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-[#E8DEC8] text-[#5C4A32] rounded-xl"
          >
            <ArrowLeft size={14} /> Voltar ao painel
          </Button>
          <Badge variant="outline" className="border-[#D6BC7E] text-[#5C4A32]">
            <ShieldAlert size={14} className="mr-1" /> Fixtures internas
          </Badge>
        </div>

        {erro && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {erro}
          </p>
        )}
        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-[#5C4A32]">
              Provas automatizadas da task
            </CardTitle>
            <p className="text-sm text-[#8A7A66]">
              Os testes usam somente registros internos e comprovante PNG fictício. O valor de R$
              0,01 é fixture, não cobrança real.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Button
              disabled={running || loading}
              onClick={executarIdempotencia}
              className="justify-start bg-[#5C4A32] text-white rounded-xl"
            >
              <Play size={15} /> Conversão repetida e auditoria
            </Button>
            <Button
              disabled={running || loading}
              onClick={executarDivergencia}
              className="justify-start bg-[#5C4A32] text-white rounded-xl"
            >
              <Play size={15} /> Divergência e pendência
            </Button>
            <Button
              disabled={running || loading}
              onClick={executarFormatoInvalido}
              className="justify-start bg-[#5C4A32] text-white rounded-xl"
            >
              <Play size={15} /> Formato inválido sem mutação
            </Button>
            <Button
              disabled={running || loading}
              onClick={executarPagamentoConfirmado}
              className="justify-start bg-[#5C4A32] text-white rounded-xl"
            >
              <Play size={15} /> Bloqueio após pagamento confirmado
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-[#5C4A32]">Resultado da sessão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!resultados.length && (
              <p className="text-sm text-[#8A7A66]">Nenhuma prova executada nesta sessão.</p>
            )}
            {resultados.map((resultado) => (
              <div
                key={resultado.id}
                className="flex items-start gap-2 rounded-xl border border-[#E8DEC8] bg-[#FBF7F0] p-3 text-sm"
              >
                {resultado.ok ? (
                  <CheckCircle2 className="mt-0.5 text-emerald-700" size={17} />
                ) : (
                  <AlertTriangle className="mt-0.5 text-red-700" size={17} />
                )}
                <div>
                  <strong className="text-[#5C4A32]">{resultado.titulo}</strong>
                  <p className="text-[#8A7A66]">{resultado.detalhe}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-[#5C4A32]">
              Conferência manual por perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#5C4A32]">
            <p>
              • Atendimento: consulta somente pedidos/pagamentos próprios e não decide pagamento.
            </p>
            <p>• Financeiro: consulta a fila e decide conferir ou divergente.</p>
            <p>
              • Produção: não acessa propostas, pedidos financeiros, pagamentos ou comprovantes.
            </p>
            <p>• Nenhuma prova desta tela chama serviço externo ou libera produção.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
