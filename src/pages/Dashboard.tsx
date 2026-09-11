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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-[#E8DEC8]/60">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-[#5C4A32] tracking-tight">
            Olá, {firstName}!
          </h1>
          <p className="text-xs md:text-sm text-[#8A7A66] mt-0.5">
            Aqui está o panorama em tempo real da Emília Bem-Casados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FDFAF5] border border-[#E8DEC8] text-xs text-[#5C4A32] shadow-xs">
            <Calendar size={13} className="text-[#B08A3E]" />
            <span className="font-medium">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <p className="hidden xl:block font-serif italic text-xs text-[#8A7A66]">
            "Mais que bem-casados, entregamos celebrações."
          </p>
        </div>
      </div>

      {/* KPI Cards — Estilo dos mockups anexos:
          Círculo bege com ícone dourado à esquerda, número grande em serif, label superior e variação suave */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Clientes */}
        <div className="bg-[#FDFAF5] border border-[#E8DEC8] rounded-2xl p-5 shadow-card hover:shadow-subtle transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#8A7A66]">
              CLIENTES CADASTRADOS
            </span>
            <div className="w-10 h-10 rounded-full bg-[#F4EEDA] flex items-center justify-center text-[#B08A3E]">
              <Users size={18} />
            </div>
          </div>
          <div className="font-serif text-3xl md:text-4xl font-semibold text-[#5C4A32] tracking-tight">
            {stats.clientes}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-[#6E7A55] font-medium">
            <TrendingUp size={13} />
            <span>cadastros totais no sistema</span>
          </div>
        </div>

        {/* Card Oportunidades / Pedidos */}
        <div className="bg-[#FDFAF5] border border-[#E8DEC8] rounded-2xl p-5 shadow-card hover:shadow-subtle transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#8A7A66]">
              OPORTUNIDADES / PEDIDOS
            </span>
            <div className="w-10 h-10 rounded-full bg-[#F4EEDA] flex items-center justify-center text-[#B08A3E]">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="font-serif text-3xl md:text-4xl font-semibold text-[#5C4A32] tracking-tight">
            {stats.oportunidades}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-[#B08A3E] font-medium">
            <TrendingUp size={13} />
            <span>pedidos registrados</span>
          </div>
        </div>

        {/* Card Pendências */}
        <div className="bg-[#FDFAF5] border border-[#E8DEC8] rounded-2xl p-5 shadow-card hover:shadow-subtle transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#8A7A66]">
              PENDÊNCIAS EM ABERTO
            </span>
            <div className="w-10 h-10 rounded-full bg-[#F4EEDA] flex items-center justify-center text-[#B08A3E]">
              <Clock size={18} />
            </div>
          </div>
          <div className="font-serif text-3xl md:text-4xl font-semibold text-[#5C4A32] tracking-tight">
            {stats.pendencias}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-[#8A7A66] font-medium">
            <span>itens aguardando ação</span>
          </div>
        </div>
      </div>

      {/* Ações Rápidas — Com estética clássica e botões elegantes */}
      <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#E8DEC8]/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif text-lg font-semibold text-[#5C4A32]">
                Ações Rápidas
              </CardTitle>
              <p className="text-xs text-[#8A7A66] mt-0.5">
                Cadastre um novo cliente ou oportunidade, ou consulte o catálogo
              </p>
            </div>
            <span className="hidden sm:inline-block font-serif italic text-xs text-[#B08A3E]">
              Gestão ágil
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex flex-wrap gap-3">
          <Button
            className="bg-[#5C4A32] hover:bg-[#473926] text-[#FDFAF5] font-medium text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            onClick={() => navigate('/clientes/novo')}
          >
            <UserPlus size={15} className="text-[#D6BC7E]" />+ Novo Cliente
          </Button>

          <Button
            className="bg-[#B08A3E] hover:bg-[#967431] text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            onClick={() => navigate('/oportunidades/nova')}
          >
            <FilePlus size={15} />+ Nova Oportunidade
          </Button>

          <Button
            variant="outline"
            className="border-[#D6BC7E] text-[#5C4A32] hover:bg-[#F4EEDA] hover:text-[#5C4A32] font-medium text-xs px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
            onClick={() => navigate('/catalogo')}
          >
            <BookOpen size={15} className="text-[#B08A3E]" />
            Ver catálogo
          </Button>

          <Button
            variant="outline"
            className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] font-medium text-xs px-4 py-2.5 rounded-xl transition-colors"
            onClick={() => navigate('/propostas/nova')}
          >
            Montador de propostas
          </Button>

          {['administrador', 'gestao'].includes(user?.papel) && (
            <>
              <Button
                variant="outline"
                className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] font-medium text-xs px-4 py-2.5 rounded-xl transition-colors"
                onClick={() => navigate('/historico')}
              >
                Ver histórico
              </Button>
              {user?.papel === 'administrador' && (
                <>
                  <Button
                    variant="outline"
                    className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] font-medium text-xs px-4 py-2.5 rounded-xl transition-colors"
                    onClick={() => navigate('/usuarios')}
                  >
                    Gerir usuários
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] font-medium text-xs px-4 py-2.5 rounded-xl transition-colors"
                    onClick={() => navigate('/integracoes/homologacao')}
                  >
                    Harness de integração
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
              <CardTitle className="font-serif text-lg font-semibold text-[#5C4A32]">
                Clientes recentes
              </CardTitle>
              <p className="text-xs text-[#8A7A66] mt-0.5">Consulta dos cadastros mais recentes</p>
            </div>
            <button
              onClick={() => navigate('/clientes/novo')}
              className="text-xs font-serif italic text-[#B08A3E] hover:underline inline-flex items-center gap-1"
            >
              Ver todos <ArrowRight size={12} />
            </button>
          </CardHeader>
          <CardContent className="pt-3 divide-y divide-[#E8DEC8]/60">
            {clientesRecentes.length === 0 && (
              <p className="text-xs text-[#8A7A66] py-4 text-center">Nenhum cliente cadastrado.</p>
            )}
            {clientesRecentes.map((cliente) => (
              <div
                key={cliente.id}
                className="py-3 px-2 flex items-center justify-between hover:bg-[#F8F3EA] rounded-xl transition-colors"
              >
                <div>
                  <p className="font-medium text-sm text-[#5C4A32]">{cliente.nome}</p>
                  <p className="text-xs text-[#8A7A66]">
                    {cliente.telefone_principal || 'Telefone não informado'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#F4EEDA] text-[#8A6A2C] border border-[#E5D7B7]">
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
              <CardTitle className="font-serif text-lg font-semibold text-[#5C4A32]">
                Oportunidades recentes
              </CardTitle>
              <p className="text-xs text-[#8A7A66] mt-0.5">
                Consulta dos pedidos-base mais recentes
              </p>
            </div>
            <button
              onClick={() => navigate('/oportunidades/nova')}
              className="text-xs font-serif italic text-[#B08A3E] hover:underline inline-flex items-center gap-1"
            >
              Ver todos <ArrowRight size={12} />
            </button>
          </CardHeader>
          <CardContent className="pt-3 divide-y divide-[#E8DEC8]/60">
            {oportunidadesRecentes.length === 0 && (
              <p className="text-xs text-[#8A7A66] py-4 text-center">
                Nenhuma oportunidade cadastrada.
              </p>
            )}
            {oportunidadesRecentes.map((oportunidade) => (
              <div
                key={oportunidade.id}
                className="py-3 px-2 flex items-center justify-between hover:bg-[#F8F3EA] rounded-xl transition-colors"
              >
                <div>
                  <p className="font-medium text-sm text-[#5C4A32]">
                    {oportunidade.expand?.cliente_id?.nome || 'Cliente não identificado'}
                  </p>
                  <p className="text-xs text-[#8A7A66]">
                    {oportunidade.tipo_evento || oportunidade.tipo_pedido || 'Tipo não informado'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#EFE8DC] text-[#5C4A32] border border-[#DDD0BC]">
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
