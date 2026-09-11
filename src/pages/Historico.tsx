import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import AppShell from '@/components/AppShell'
import { ArrowLeft, ShieldCheck, History as HistoryIcon } from 'lucide-react'

const roleLabels: Record<string, string> = {
  administrador: 'Administrador',
  gestao: 'Gestão',
  atendimento: 'Atendimento',
  financeiro: 'Financeiro',
  producao: 'Produção',
  cliente_externo: 'Cliente/externo',
}
const actionLabel: Record<string, string> = {
  criacao: 'Criação',
  edicao: 'Edição',
  revogacao: 'Revogação',
  acesso: 'Acesso',
  exclusao: 'Exclusão',
}
const objectLabel: Record<string, string> = {
  clientes: 'Cliente',
  oportunidades: 'Oportunidade/pedido',
  catalogo_itens: 'Item de catálogo',
  users: 'Usuário',
  historico_eventos: 'Histórico',
  auditoria: 'Auditoria',
}

export default function Historico() {
  const navigate = useNavigate()
  const [items, setItems] = useState<any[]>([])
  const [error, setError] = useState('')
  const canRead = ['administrador', 'gestao'].includes(pb.authStore.record?.papel)

  useEffect(() => {
    if (!canRead) return
    pb.collection('auditoria')
      .getList(1, 100, { sort: '-created' })
      .then((result) => setItems(result.items))
      .catch((err) => setError(err.message || 'Não foi possível carregar a auditoria.'))
  }, [canRead])

  if (!canRead) {
    return (
      <AppShell>
        <div className="w-full max-w-2xl mx-auto py-12">
          <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card p-6 text-center">
            <p role="alert" className="text-sm md:text-base text-red-700">
              Você não tem permissão para consultar o histórico de auditoria.
            </p>
            <Button
              className="mt-4 bg-[#5C4A32] text-white hover:bg-[#473926] text-sm rounded-xl px-4 py-2"
              onClick={() => navigate('/')}
            >
              Voltar ao início
            </Button>
          </Card>
        </div>
      </AppShell>
    )
  }

  const resultLabel = (r: string) =>
    r === 'permitido' ? 'Permitida' : r === 'negado' ? 'Negada' : 'Falha'

  return (
    <AppShell
      title="Histórico de Auditoria"
      subtitle="Consulta somente leitura de eventos e rastreabilidade de ações no sistema"
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

          <span className="text-xs font-sans text-[#B08A3E] flex items-center gap-1 font-medium">
            <ShieldCheck size={14} />
            Rastreabilidade canônica
          </span>
        </div>

        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#E8DEC8]/50">
            <CardTitle className="font-serif text-title-min md:text-2xl font-semibold text-[#5C4A32]">
              Eventos Registrados
            </CardTitle>
            <p className="text-xs md:text-sm text-[#8A7A66]">
              Consulta somente leitura. Registros são imutáveis e auditáveis.
            </p>
          </CardHeader>
        </Card>

        {error && (
          <p
            role="alert"
            className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200"
          >
            {error}
          </p>
        )}

        {!error && items.length === 0 && (
          <p className="text-xs text-[#8A7A66] py-8 text-center bg-[#FDFAF5] rounded-2xl border border-[#E8DEC8]">
            Nenhum evento registrado ainda.
          </p>
        )}

        <div className="space-y-2.5">
          {items.map((item) => (
            <Card
              key={item.id}
              className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card hover:shadow-subtle transition-shadow overflow-hidden"
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#B08A3E]" />
                      <p className="font-semibold text-base text-[#5C4A32]">
                        {item.descricao ||
                          `${actionLabel[item.acao] || item.acao} · ${objectLabel[item.objeto_tipo] || item.objeto_tipo}`}
                      </p>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          item.resultado === 'permitido'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {resultLabel(item.resultado)}
                      </span>
                    </div>

                    <p className="text-sm text-[#5C4A32]">
                      Objeto: <span className="font-sans font-medium">{item.objeto_tipo}</span>
                      {item.objeto_id ? ` · ID: ${item.objeto_id}` : ''}
                    </p>

                    <p className="text-xs text-[#8A7A66]">
                      Motivo: {item.motivo || 'não informado'} · Origem:{' '}
                      {item.origem || 'não informada'}
                    </p>
                  </div>

                  <div className="text-xs md:text-sm text-[#8A7A66] md:text-right bg-[#FBF7F0] p-2.5 rounded-xl border border-[#E8DEC8]/50">
                    <p>
                      <strong>Ator:</strong> {item.ator_nome || 'não informado'}
                    </p>
                    <p>
                      <strong>Papel:</strong>{' '}
                      {roleLabels[item.papel] || item.papel || 'não informado'}
                    </p>
                    <p className="font-medium text-[#5C4A32] mt-1 font-data tabular-nums">
                      {new Date(item.created).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
