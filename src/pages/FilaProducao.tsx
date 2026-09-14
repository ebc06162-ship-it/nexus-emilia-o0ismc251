import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import AppShell from '@/components/AppShell'
import pb from '@/lib/pocketbase/client'
import { ArrowLeft, Printer, AlertTriangle, PlayCircle, CheckCircle2, PackageX } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const statusLabels: Record<string, string> = {
  pronto_producao: 'Pronto para produção',
  em_producao: 'Em produção',
  pronto_expedicao: 'Pronto para expedição',
  ocorrencia: 'Ocorrência',
  entrega: 'Entrega',
  falta_definicao: 'Falta definição',
  em_alteracao: 'Em alteração',
  previsao_entrega: 'Previsão de entrega',
  suspenso: 'Suspenso',
}

const formatData = (v: string) => (v ? new Date(v).toLocaleDateString('pt-BR') : 'Sem data')

export default function FilaProducao() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [pendencias, setPendencias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const papel = pb.authStore.record?.papel
  const isLider =
    pb.authStore.record?.lider_producao || ['administrador', 'gestao'].includes(papel)
  const isProducao = papel === 'producao' || isLider

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const result = await pb.collection('pedidos').getList(1, 100, {
        filter: "status_comercial = 'aprovado'",
        sort: 'data_evento', // fila natural: entrega mais próxima primeiro (G3-OPS-01)
      })
      setPedidos(result.items)
      const pend = await pb.collection('pendencias').getList(1, 100, { filter: "status = 'aberta'" })
      setPendencias(pend.items)
    } catch (error: any) {
      setErro(error?.message || 'Erro ao carregar a fila')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!pb.authStore.isValid) {
      navigate('/login')
      return
    }
    carregar()
  }, [])

  const pendenciasDoPedido = (oportunidadeId: string) =>
    pendencias.filter((p: any) => p.oportunidade_id === oportunidadeId)

  const liberar = async (pedido: any) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/pedidos/${pedido.id}/liberar`,
        {
          method: 'POST',
          headers: {
            Authorization: pb.authStore.token,
            'Content-Type': 'application/json',
          },
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Erro ao liberar')
      if (data.ok) {
        toast({
          title: data.idempotente ? 'Pedido já estava liberado' : 'Pedido liberado para produção',
          description: `Versão ${data.versao || pedido.versao_proposta}${data.urgente ? ' · URGENTE' : ''}`,
        })
      } else {
        toast({
          title: 'Liberação bloqueada',
          description: (data.gates || []).map((g: any) => g.motivo).join(' · '),
          variant: 'destructive',
        })
      }
      carregar()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    }
  }

  const registrarAndamento = async (
    pedido: any,
    acao: string,
    motivo?: string,
    proxima?: string,
  ) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/pedidos/${pedido.id}/andamento`,
        {
          method: 'POST',
          headers: {
            Authorization: pb.authStore.token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ acao, motivo, proxima_acao: proxima }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Erro')
      toast({ title: 'Andamento registrado', description: statusLabels[data.status] || data.status })
      carregar()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    }
  }

  const pedirMotivo = (acao: string) => {
    const motivo = window.prompt(
      `Motivo da ${acao === 'falta_material' ? 'falta de material' : 'impossibilidade'}:`,
    )
    if (!motivo) return
    const proxima = window.prompt('Próxima ação (quem resolve e o que fazer):')
    if (!proxima) return
    return { motivo, proxima }
  }

  const imprimirFila = () => {
    const linhas = pedidos
      .map((p: any) => {
        const comp =
          typeof p.composicao_snapshot === 'string'
            ? p.composicao_snapshot
            : JSON.stringify(p.composicao_snapshot || {})
        return [
          `PEDIDO ${p.id} · v${p.versao_proposta}`,
          `Cliente: ${p.expand?.cliente_id?.nome || p.cliente_id || '-'}`,
          `Entrega: ${formatData(p.data_evento)}${p.urgente ? ' · URGENTE' : ''}`,
          `Quantidade: ${p.quantidade_snapshot ?? '-'}`,
          `Composição: ${comp}`,
          `Status: ${statusLabels[p.status_operacional] || p.status_operacional || '-'}`,
          '',
        ].join('\n')
      })
      .join('\n---\n')
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(
      `<html><head><title>Fila de produção — Emília Bem-Casados</title></head><body style="font-family: Georgia, serif; padding: 24px;"><h1 style="color:#5C4A32">Fila de produção</h1><p>Gerada em ${new Date().toLocaleString('pt-BR')} · ID e versão em cada item para reconciliação</p><pre style="font-size:13px; white-space:pre-wrap;">${linhas}</pre></body></html>`,
    )
    w.document.close()
    w.print()
  }

  const hoje = new Date()
  const diasAte = (data: string) => {
    if (!data) return null
    return Math.ceil((new Date(data) - hoje) / 86400000)
  }

  return (
    <AppShell title="Fila de Produção" subtitle="Pedidos aprovados, ordenados pela data de entrega">
      <div className="w-full mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] text-xs rounded-xl flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            Voltar ao painel
          </Button>
          <Button
            variant="outline"
            onClick={imprimirFila}
            className="border-[#B08A3E] text-[#5C4A32] hover:bg-[#F4EEDA] text-xs rounded-xl flex items-center gap-1.5"
          >
            <Printer size={14} />
            Imprimir fila
          </Button>
        </div>

        {erro && (
          <div className="rounded-xl border border-[#7A2E2E] bg-[#FAF1F1] p-3 text-sm text-[#7A2E2E]">
            {erro}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#8A7A66]">Carregando fila...</p>
        ) : pedidos.length === 0 ? (
          <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl">
            <CardContent className="pt-6 text-center text-sm text-[#8A7A66]">
              Nenhum pedido aprovado na fila.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p: any) => {
              const dias = diasAte(p.data_evento)
              const urgente = dias !== null && dias <= 7
              const pends = pendenciasDoPedido(p.oportunidade_id)
              const status = p.status_operacional || 'aguardando_liberacao'
              return (
                <Card
                  key={p.id}
                  className={`bg-[#FDFAF5] border rounded-2xl shadow-card ${urgente ? 'border-[#B08A3E] border-2' : 'border-[#E8DEC8]'}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="font-serif text-lg font-semibold text-[#5C4A32]">
                        {p.expand?.cliente_id?.nome || 'Cliente'} · entrega {formatData(p.data_evento)}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {urgente && (
                          <Badge className="bg-[#B08A3E] text-white text-xs">
                            <AlertTriangle size={12} className="mr-1 inline" /> URGENTE ({dias}d)
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs border-[#E8DEC8] text-[#5C4A32]">
                          {statusLabels[status] || status}
                        </Badge>
                        <span className="text-xs text-[#8A7A66]">
                          {p.id} · v{p.versao_proposta}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <span className="text-xs text-[#8A7A66] block">Quantidade</span>
                        <span className="font-medium text-[#5C4A32]">
                          {p.quantidade_snapshot ?? '-'} un.
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-xs text-[#8A7A66] block">Composição</span>
                        <span className="text-[#5C4A32]">
                          {typeof p.composicao_snapshot === 'string'
                            ? p.composicao_snapshot.slice(0, 120)
                            : JSON.stringify(p.composicao_snapshot || {}).slice(0, 120)}
                        </span>
                      </div>
                    </div>
                    {pends.length > 0 && (
                      <div className="rounded-lg bg-[#FAF1F1] border border-[#7A2E2E]/30 p-2">
                        <span className="text-xs font-semibold text-[#7A2E2E]">
                          Pendências em aberto ({pends.length})
                        </span>
                        {pends.slice(0, 3).map((pd: any) => (
                          <p key={pd.id} className="text-xs text-[#7A2E2E]">
                            · {pd.motivo}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap pt-1">
                      {isLider && status !== 'pronto_producao' && status !== 'em_producao' && status !== 'pronto_expedicao' && (
                        <Button
                          size="sm"
                          onClick={() => liberar(p)}
                          className="bg-[#5C4A32] hover:bg-[#473926] text-white text-xs rounded-xl"
                        >
                          Liberar para produção
                        </Button>
                      )}
                      {isProducao && status === 'pronto_producao' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => registrarAndamento(p, 'iniciar')}
                          className="border-[#E8DEC8] text-[#5C4A32] text-xs rounded-xl"
                        >
                          <PlayCircle size={14} className="mr-1" /> Iniciar produção
                        </Button>
                      )}
                      {isProducao && status === 'em_producao' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => registrarAndamento(p, 'concluir')}
                            className="border-[#E8DEC8] text-[#5C4A32] text-xs rounded-xl"
                          >
                            <CheckCircle2 size={14} className="mr-1" /> Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const r = pedirMotivo('falta_material')
                              if (r) registrarAndamento(p, 'falta_material', r.motivo, r.proxima)
                            }}
                            className="border-[#B08A3E] text-[#8A6A2C] text-xs rounded-xl"
                          >
                            <PackageX size={14} className="mr-1" /> Falta de material
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const r = pedirMotivo('impossibilidade')
                              if (r) registrarAndamento(p, 'impossibilidade', r.motivo, r.proxima)
                            }}
                            className="border-[#7A2E2E] text-[#7A2E2E] text-xs rounded-xl"
                          >
                            <AlertTriangle size={14} className="mr-1" /> Impossibilidade
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
