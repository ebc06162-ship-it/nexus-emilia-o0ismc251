import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'

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
  const { toast } = useToast()

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

  const handleLogout = () => {
    pb.authStore.clear()
    toast({
      title: 'Logout realizado',
      description: 'Até logo!',
    })
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <header className="bg-[#3D2314] text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Nexus Emília</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">Olá, {user?.name}</span>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-white border-white hover:bg-white hover:text-[#3D2314]"
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-8 px-4">
        <h2 className="text-2xl font-bold mb-6 text-[#3D2314]">Painel de Controle</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#C69D5F]">{stats.clientes}</div>
              <p className="text-xs text-gray-500 mt-1">cadastros totais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Oportunidades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#C69D5F]">{stats.oportunidades}</div>
              <p className="text-xs text-gray-500 mt-1">pedidos registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pendências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#C69D5F]">{stats.pendencias}</div>
              <p className="text-xs text-gray-500 mt-1">itens em aberto</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Cadastre um novo cliente ou oportunidade</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button
              className="bg-[#C69D5F] hover:bg-[#DCC39E] text-white"
              onClick={() => navigate('/clientes/novo')}
            >
              + Novo Cliente
            </Button>
            <Button
              className="bg-[#C69D5F] hover:bg-[#DCC39E] text-white"
              onClick={() => navigate('/oportunidades/nova')}
            >
              + Nova Oportunidade
            </Button>
            <Button
              variant="outline"
              className="border-[#C69D5F] text-[#3D2314]"
              onClick={() => navigate('/catalogo')}
            >
              Ver catálogo
            </Button>
            {['administrador', 'gestao'].includes(user?.papel) && (
              <Button
                variant="outline"
                className="border-[#C69D5F] text-[#3D2314]"
                onClick={() => navigate('/historico')}
              >
                Ver histórico
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Clientes recentes</CardTitle>
              <CardDescription>Consulta dos cadastros mais recentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientesRecentes.length === 0 && (
                <p className="text-sm text-gray-600">Nenhum cliente cadastrado.</p>
              )}
              {clientesRecentes.map((cliente) => (
                <div key={cliente.id} className="border-b pb-2 last:border-0">
                  <p className="font-medium text-[#3D2314]">{cliente.nome}</p>
                  <p className="text-sm text-gray-600">
                    {cliente.telefone_principal || 'Telefone não informado'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {cliente.classificacao_comercial || 'Classificação não informada'}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Oportunidades recentes</CardTitle>
              <CardDescription>Consulta dos pedidos-base mais recentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {oportunidadesRecentes.length === 0 && (
                <p className="text-sm text-gray-600">Nenhuma oportunidade cadastrada.</p>
              )}
              {oportunidadesRecentes.map((oportunidade) => (
                <div key={oportunidade.id} className="border-b pb-2 last:border-0">
                  <p className="font-medium text-[#3D2314]">
                    {oportunidade.expand?.cliente_id?.nome || 'Cliente não identificado'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {oportunidade.tipo_evento || oportunidade.tipo_pedido || 'Tipo não informado'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status: {oportunidade.status || 'Não informado'}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>

      <Toaster />
    </div>
  )
}

export default Dashboard
