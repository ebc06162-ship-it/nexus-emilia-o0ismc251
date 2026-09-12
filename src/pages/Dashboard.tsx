import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { Toaster } from '@/components/ui/toaster'
import AppShell from '@/components/AppShell'
import {
  Users,
  ShoppingBag,
  Clock,
  UserPlus,
  FilePlus,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Calendar,
  ShieldCheck,
} from 'lucide-react'

const Dashboard = () => {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    clientes: 0,
    oportunidades: 0,
    pendencias: 0,
  })
  const [clientesRecentes, setClientesRecentes] = useState([])
  const [oportunidadesRecentes, setOportunidadesRecentes] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!pb.authStore.isValid) {
      navigate('/login')
      return
    }
    setUser(pb.authStore.record)
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const clientes = await pb.collection('clientes').getList(1, 1)
      const oportunidades = await pb.collection('oportunidades').getList(1, 1)
      const pendencias = await pb.collection('pendencias').getList(1, 1)
      const clientesLista = await pb.collection('clientes').getList(1, 10, { sort: '-created' })
      const oportunidadesLista = await pb
        .collection('oportunidades')
        .getList(1, 10, { sort: '-created', expand: 'cliente_id' })

      setClientesRecentes(clientesLista.items)
      setOportunidadesRecentes(oportunidadesLista.items)
      setStats({
        clientes: clientes.totalItems,
        oportunidades: oportunidades.totalItems,
        pendencias: pendencias.totalItems,
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  // Nome formatado para a saudação estilo mock: "Olá, Fernanda!"
  const firstName = user?.name ? user.name.split(' ')[0] : 'Fernanda'

  return (
    <AppShell>
      {/* Banner de Saudação estilo referência */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E8DEC8]/60">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-[#5C4A32] tracking-tight">
            Olá, {firstName}!
          </h1>
          <p className="text-sm md:text-base text-[#8A7A66] mt-1">
            Aqui está o panorama em tempo real da Emília Bem-Casados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.papel === 'administrador' && (
            <Button
              variant="outline"
              className="border-[#B08A3E] bg-[#F4EEDA] text-[#5C4A32] hover:bg-[#EFE5D3] font-medium text-sm px-3.5 py-2 rounded-xl transition-colors"
              onClick={() => navigate('/regressao/f2-t010')}
            >
              <ShieldCheck size={16} className="mr-1.5 text-[#B08A3E]" />
              Regressão F2-T010
            </Button>
          )}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FDFAF5] border border-[#E8DEC8] text-sm text-[#5C4A32] shadow-xs">
            <Calendar size={15} className="text-[#B08A3E]" />
            <span className="font-medium">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <p className="hidden xl:block font-serif italic text-title-min md:text-xl text-[#8A7A66]">
            "Mais que bem-casados, entregamos celebrações."
          </p>
        </div>
      </div>

      {/* KPI Cards — Estilo dos mockups:
          Círculo bege com ícone dourado à esquerda, número em Bitter com numerais tabulares, label superior em Mulish uppercase tracking */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card Clientes */}
        <div className="bg-[#FDFAF5] border border-[#E8DEC8] rounded-2xl p-6 shadow-card hover:shadow-subtle transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-[0.18em] font-semibold text-[#8A7A66] font-sans">
              CLIENTES CADASTRADOS
            </span>
            <div className="w-11 h-11 rounded-full bg-[#F4EEDA] flex items-center justify-center text-[#B08A3E]">
              <Users size={20} />
            </div>
          </div>
          <div className="font-data tabular-nums text-4xl md:text-5xl font-semibold text-[#5C4A32] tracking-tight">
            {stats.clientes}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-sm text-[#6E7A55] font-medium font-sans">
            <TrendingUp size={15} />
            <span>cadastros totais no sistema</span>
          </div>
        </div>

        {/* Card Oportunidades / Pedidos */}
        <div className="bg-[#FDFAF5] border border-[#E8DEC8] rounded-2xl p-6 shadow-card hover:shadow-subtle transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-[0.18em] font-semibold text-[#8A7A66] font-sans">
              OPORTUNIDADES / PEDIDOS
            </span>
            <div className="w-11 h-11 rounded-full bg-[#F4EEDA] flex items-center justify-center text-[#B08A3E]">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="font-data tabular-nums text-4xl md:text-5xl font-semibold text-[#5C4A32] tracking-tight">
            {stats.oportunidades}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-sm text-[#B08A3E] font-medium font-sans">
            <TrendingUp size={15} />
            <span>pedidos registrados</span>
          </div>
        </div>

        {/* Card Pendências */}
        <div className="bg-[#FDFAF5] border border-[#E8DEC8] rounded-2xl p-6 shadow-card hover:shadow-subtle transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-[0.18em] font-semibold text-[#8A7A66] font-sans">
              PENDÊNCIAS EM ABERTO
            </span>
            <div className="w-11 h-11 rounded-full bg-[#F4EEDA] flex items-center justify-center text-[#B08A3E]">
              <Clock size={20} />
            </div>
          </div>
          <div className="font-data tabular-nums text-4xl md:text-5xl font-semibold text-[#5C4A32] tracking-tight">
            {stats.pendencias}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-sm text-[#8A7A66] font-medium font-sans">
            <span>itens aguardando ação</span>
          </div>
        </div>
      </div>

      {/* Ações Rápidas — Com estética clássica e botões elegantes */}
      <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#E8DEC8]/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif text-xl md:text-2xl font-semibold text-[#5C4A32]">
                Ações Rápidas
              </CardTitle>
              <p className="text-sm text-[#8A7A66] mt-0.5">
                Cadastre um novo cliente ou oportunidade, ou consulte o catálogo
              </p>
            </div>
            <span className="hidden sm:inline-block font-sans text-sm text-[#B08A3E] font-medium">
              Gestão ágil
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex flex-wrap gap-3">
          <Button
            className="bg-[#5C4A32] hover:bg-[#473926] text-[#FDFAF5] font-medium text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            onClick={() => navigate('/clientes/novo')}
          >
            <UserPlus size={16} className="text-[#D6BC7E]" />+ Novo Cliente
          </Button>

          <Button
            className="bg-[#B08A3E] hover:bg-[#967431] text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            onClick={() => navigate('/oportunidades/nova')}
          >
            <FilePlus size={16} />+ Nova Oportunidade
          </Button>

          <Button
            variant="outline"
            className="border-[#D6BC7E] text-[#5C4A32] hover:bg-[#F4EEDA] hover:text-[#5C4A32] font-medium text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
            onClick={() => navigate('/catalogo')}
          >
            <BookOpen size={16} className="text-[#B08A3E]" />
            Ver catálogo
          </Button>

          <Button
            variant="outline"
            className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
            onClick={() => navigate('/propostas/nova')}
          >
            Orçamentos
          </Button>

          {['administrador', 'gestao', 'financeiro', 'atendimento'].includes(user?.papel) && (
            <Button
              variant="outline"
              className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
              onClick={() => navigate('/financeiro/fila')}
            >
              Fila Financeira
            </Button>
          )}

          {['administrador', 'gestao'].includes(user?.papel) && (
            <>
              <Button
                variant="outline"
                className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
                onClick={() => navigate('/historico')}
              >
                Ver histórico
              </Button>
              {user?.papel === 'administrador' && (
                <>
                  <Button
                    variant="outline"
                    className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
                    onClick={() => navigate('/usuarios')}
                  >
                    Gerir usuários
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
                    onClick={() => navigate('/integracoes/homologacao')}
                  >
                    Harness de integração
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
                    onClick={() => navigate('/regressao/f2-t010')}
                  >
                    Regressão F2-T010
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Listas Recentes: Clientes e Oportunidades com acabamento elegante */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Clientes recentes */}
        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#E8DEC8]/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-serif text-xl md:text-2xl font-semibold text-[#5C4A32]">
                Clientes recentes
              </CardTitle>
              <p className="text-sm text-[#8A7A66] mt-0.5">Consulta dos cadastros mais recentes</p>
            </div>
            <button
              onClick={() => navigate('/clientes/novo')}
              className="text-sm font-sans text-[#B08A3E] hover:underline inline-flex items-center gap-1 font-medium"
            >
              Ver todos <ArrowRight size={14} />
            </button>
          </CardHeader>
          <CardContent className="pt-3 divide-y divide-[#E8DEC8]/60">
            {clientesRecentes.length === 0 && (
              <p className="text-sm text-[#8A7A66] py-4 text-center">Nenhum cliente cadastrado.</p>
            )}
            {clientesRecentes.map((cliente) => (
              <div
                key={cliente.id}
                className="py-3 px-2 flex items-center justify-between hover:bg-[#F8F3EA] rounded-xl transition-colors"
              >
                <div>
                  <p className="font-medium text-base text-[#5C4A32]">{cliente.nome}</p>
                  <p className="text-sm text-[#8A7A66]">
                    {cliente.telefone_principal || 'Telefone não informado'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#F4EEDA] text-[#8A6A2C] border border-[#E5D7B7]">
                    {cliente.classificacao_comercial || 'Padrão'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Oportunidades recentes */}
        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#E8DEC8]/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-serif text-xl md:text-2xl font-semibold text-[#5C4A32]">
                Oportunidades recentes
              </CardTitle>
              <p className="text-sm text-[#8A7A66] mt-0.5">
                Consulta dos pedidos-base mais recentes
              </p>
            </div>
            <button
              onClick={() => navigate('/oportunidades/nova')}
              className="text-sm font-sans text-[#B08A3E] hover:underline inline-flex items-center gap-1 font-medium"
            >
              Ver todos <ArrowRight size={14} />
            </button>
          </CardHeader>
          <CardContent className="pt-3 divide-y divide-[#E8DEC8]/60">
            {oportunidadesRecentes.length === 0 && (
              <p className="text-sm text-[#8A7A66] py-4 text-center">
                Nenhuma oportunidade cadastrada.
              </p>
            )}
            {oportunidadesRecentes.map((oportunidade) => (
              <div
                key={oportunidade.id}
                className="py-3 px-2 flex items-center justify-between hover:bg-[#F8F3EA] rounded-xl transition-colors"
              >
                <div>
                  <p className="font-medium text-base text-[#5C4A32]">
                    {oportunidade.expand?.cliente_id?.nome || 'Cliente não identificado'}
                  </p>
                  <p className="text-sm text-[#8A7A66]">
                    {oportunidade.tipo_evento || oportunidade.tipo_pedido || 'Tipo não informado'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#EFE8DC] text-[#5C4A32] border border-[#DDD0BC]">
                    {oportunidade.status || 'Não informado'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </AppShell>
  )
}

export default Dashboard
