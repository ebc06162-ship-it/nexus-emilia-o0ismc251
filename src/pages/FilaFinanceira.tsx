import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import AppShell from '@/components/AppShell'
import pb from '@/lib/pocketbase/client'
import { ArrowLeft, CheckCircle2, AlertTriangle, Upload, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const statusLabels: Record<string, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  comprovante_recebido: 'Comprovante recebido',
  em_conferencia: 'Em conferência',
  conferido: 'Conferido',
  divergente: 'Divergente',
  pago: 'Pago',
}

const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function FilaFinanceira() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [pedidosAprovados, setPedidosAprovados] = useState<any[]>([])
  const [arquivos, setArquivos] = useState<Record<string, File[]>>({})
  const [motivos, setMotivos] = useState<Record<string, string>>({})
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const papel = pb.authStore.record?.papel
  const podeDecidir = ['administrador', 'gestao', 'financeiro'].includes(papel)

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const pedidosResult = await pb.collection('pedidos').getList(1, 100, { sort: '-created' })
      const pagamentosResult = await pb
        .collection('pagamentos')
        .getList(1, 100, { sort: 'vencimento', expand: 'pedido_id' })
      setPedidos(pedidosResult.items)
      setPagamentos(pagamentosResult.items)
      setPedidosAprovados(
        pedidosResult.items.filter((item: any) => item.status_comercial === 'aprovado'),
      )
    } catch (err: any) {
      setErro(err.message || 'Não foi possível carregar a fila financeira.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const prepararPagamento = async (pedidoId: string) => {
    setMensagem('')
    setErro('')
    try {
      await pb.send(`/backend/v1/pedidos/${pedidoId}/pagamentos`, {
        method: 'POST',
        body: {
          forma_pagamento: 'pix',
          valor_previsto: 0.01,
          vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          motivo: 'Fixture de homologação F2-T008',
        },
      })
      setMensagem('Plano de pagamento de homologação criado. Nenhum valor real foi registrado.')
      await carregar()
    } catch (err: any) {
      setErro(err.message || 'Não foi possível preparar o pagamento.')
    }
  }

  const upload = async (pagamentoId: string) => {
    const selecionados = arquivos[pagamentoId] || []
    setMensagem('')
    setErro('')
    if (selecionados.length < 1 || selecionados.length > 3) {
      setErro('Selecione de 1 a 3 arquivos.')
      return
    }
    const invalid = selecionados.find(
      (file) =>
        file.size > 10 * 1024 * 1024 ||
        !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type),
    )
    if (invalid) {
      setErro('Cada arquivo deve ser PDF, JPG/JPEG ou PNG e ter até 10 MB.')
      return
    }
    const form = new FormData()
    selecionados.forEach((file) => form.append('arquivos', file))
    try {
      await pb.send(`/backend/v1/pagamentos/${pagamentoId}/comprovantes`, {
        method: 'POST',
        body: form,
      })
      setMensagem(
        'Comprovante recebido e enviado para conferência. O pagamento ainda não foi confirmado.',
      )
      setArquivos((current) => ({ ...current, [pagamentoId]: [] }))
      await carregar()
    } catch (err: any) {
      setErro(err.message || 'Não foi possível enviar o comprovante.')
    }
  }

  const decidir = async (pagamentoId: string, acao: 'conferir' | 'divergente') => {
    setMensagem('')
    setErro('')
    if (acao === 'divergente' && !(motivos[pagamentoId] || '').trim()) {
      setErro('Informe o motivo da divergência.')
      return
    }
    try {
      await pb.send(`/backend/v1/pagamentos/${pagamentoId}/decisao`, {
        method: 'POST',
        body: { acao, motivo: motivos[pagamentoId] || '' },
      })
      setMensagem(
        acao === 'conferir'
          ? 'Pagamento conferido.'
          : 'Divergência registrada e pendência enviada ao Atendimento.',
      )
      await carregar()
    } catch (err: any) {
      setErro(err.message || 'Não foi possível registrar a decisão.')
    }
  }

  return (
    <AppShell
      title="Fila Financeira"
      subtitle="Comprovantes versionados e conferência sem confirmação automática"
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
          <span className="text-xs text-[#8A7A66] inline-flex items-center gap-1">
            <WalletCards size={14} /> Homologação, sem arquivos reais
          </span>
        </div>
        {mensagem && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {mensagem}
          </p>
        )}
        {erro && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {erro}
          </p>
        )}
        {loading && <p className="text-sm text-[#8A7A66]">Carregando pagamentos...</p>}
        {!loading && pedidosAprovados.length > 0 && (
          <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-xl text-[#5C4A32]">
                Preparar pagamento de homologação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-[#8A7A66]">
                Use um pedido aprovado para criar um plano fictício e testar a fila. O valor é
                apenas R$ 0,01 de fixture.
              </p>
              {pedidosAprovados.map((pedido) => (
                <div
                  key={pedido.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8DEC8] p-3"
                >
                  <span className="text-sm text-[#5C4A32]">Pedido {pedido.id}</span>
                  <Button
                    type="button"
                    onClick={() => prepararPagamento(pedido.id)}
                    className="bg-[#5C4A32] text-white rounded-xl"
                  >
                    Preparar fixture
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {!loading && !pagamentos.length && (
          <p className="rounded-2xl border border-[#E8DEC8] bg-[#FDFAF5] p-6 text-sm text-[#8A7A66]">
            Nenhum pagamento preparado ainda. Use um pedido aprovado acima para criar uma fixture.
          </p>
        )}
        <div className="space-y-4">
          {pagamentos.map((pagamento) => {
            const pedido =
              pedidos.find((item) => item.id === pagamento.pedido_id) || pagamento.expand?.pedido_id
            const selected = arquivos[pagamento.id] || []
            const canUpload = ['aguardando_pagamento', 'divergente'].includes(pagamento.status)
            const canDecide =
              podeDecidir && ['comprovante_recebido', 'em_conferencia'].includes(pagamento.status)
            return (
              <Card
                key={pagamento.id}
                className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="font-serif text-xl text-[#5C4A32]">
                        Pagamento do pedido {pedido?.id || pagamento.pedido_id}
                      </CardTitle>
                      <p className="text-sm text-[#8A7A66]">
                        Forma: {pagamento.forma_pagamento} · vencimento:{' '}
                        {new Date(pagamento.vencimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit border-[#D6BC7E] text-[#5C4A32]">
                      {statusLabels[pagamento.status] || pagamento.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3 text-sm">
                    <div>
                      <span className="text-[#8A7A66]">Previsto</span>
                      <p className="font-data text-lg">{formatMoney(pagamento.valor_previsto)}</p>
                    </div>
                    <div>
                      <span className="text-[#8A7A66]">Recebido registrado</span>
                      <p className="font-data text-lg">{formatMoney(pagamento.valor_recebido)}</p>
                    </div>
                    <div>
                      <span className="text-[#8A7A66]">Versão do plano</span>
                      <p className="font-data text-lg">{pagamento.versao_plano}</p>
                    </div>
                  </div>
                  {canUpload && (
                    <div className="rounded-xl border border-[#E8DEC8] bg-[#FBF7F0] p-3 space-y-2">
                      <Label htmlFor={`file-${pagamento.id}`}>
                        Comprovantes (1 a 3 arquivos, até 10 MB cada)
                      </Label>
                      <Input
                        id={`file-${pagamento.id}`}
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        onChange={(event) =>
                          setArquivos((current) => ({
                            ...current,
                            [pagamento.id]: Array.from(event.target.files || []),
                          }))
                        }
                      />
                      <p className="text-xs text-[#8A7A66]">
                        Aceitos: PDF, JPG/JPEG e PNG. O pagamento só muda após decisão do
                        Financeiro.
                      </p>
                      <Button
                        type="button"
                        onClick={() => upload(pagamento.id)}
                        className="bg-[#5C4A32] text-white rounded-xl"
                      >
                        <Upload size={15} /> Enviar comprovante
                      </Button>
                      {selected.length > 0 && (
                        <p className="text-xs text-[#5C4A32]">
                          {selected.length} arquivo(s) selecionado(s).
                        </p>
                      )}
                    </div>
                  )}
                  {canDecide && (
                    <div className="rounded-xl border border-[#E8DEC8] bg-[#FBF7F0] p-3 space-y-2">
                      <p className="text-sm font-semibold text-[#5C4A32]">Decisão do Financeiro</p>
                      <Input
                        placeholder="Motivo obrigatório se houver divergência"
                        value={motivos[pagamento.id] || ''}
                        onChange={(event) =>
                          setMotivos((current) => ({
                            ...current,
                            [pagamento.id]: event.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => decidir(pagamento.id, 'conferir')}
                          className="bg-emerald-700 text-white rounded-xl"
                        >
                          <CheckCircle2 size={15} /> Conferir pagamento
                        </Button>
                        <Button
                          type="button"
                          onClick={() => decidir(pagamento.id, 'divergente')}
                          variant="outline"
                          className="border-red-200 text-red-700 rounded-xl"
                        >
                          <AlertTriangle size={15} /> Marcar divergente
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
