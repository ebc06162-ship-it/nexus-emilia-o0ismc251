import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'

const roleLabels = {
  administrador: 'Administrador',
  atendimento: 'Atendimento',
  gestao: 'Gestão',
  financeiro: 'Financeiro',
  producao: 'Produção',
  cliente_externo: 'Cliente/externo',
}

export default function Usuarios() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const current = pb.authStore.record
  const isAdmin = current?.papel === 'administrador'

  const load = async () => {
    try {
      const result = await pb.collection('users').getList(1, 100, { sort: 'name' })
      setUsers(result.items)
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os usuários.')
    }
  }
  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin])

  const revoke = async (user) => {
    if (!window.confirm(`Revogar o acesso de ${user.name || user.email}?`)) return
    try {
      await pb.send(`/backend/v1/admin/users/${user.id}/revoke`, { method: 'POST', body: {} })
      await load()
    } catch (err) {
      setError(err.message || 'Não foi possível revogar o usuário.')
    }
  }

  if (!isAdmin)
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-8">
        <Card>
          <CardContent className="p-6">
            <p role="alert" className="text-[#7A2E2E]">
              Você não tem permissão para consultar usuários.
            </p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="bg-[#3D2314] text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#DCC39E]">Nexus Emília</p>
            <h1 className="text-2xl font-semibold">Gestão de usuários</h1>
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
      <main className="container mx-auto py-8 px-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Usuários de homologação</CardTitle>
            <p className="text-sm text-gray-600">
              Senhas e tokens nunca são exibidos. A revogação é registrada na auditoria.
            </p>
          </CardHeader>
        </Card>
        {error && (
          <p role="alert" className="text-[#7A2E2E]">
            {error}
          </p>
        )}
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-[#3D2314]">{user.name || 'Sem nome'}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500">
                  {roleLabels[user.papel] || user.papel} · {user.ativo ? 'Ativo' : 'Revogado'}
                </p>
              </div>
              <Button
                variant="outline"
                disabled={!user.ativo || user.id === current.id}
                onClick={() => revoke(user)}
              >
                Revogar acesso
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}
