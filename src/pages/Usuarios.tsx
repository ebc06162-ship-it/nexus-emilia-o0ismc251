import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import AppShell from '@/components/AppShell'
import { ArrowLeft, UserX, Users } from 'lucide-react'

const roleLabels: Record<string, string> = {
  administrador: 'Administrador',
  atendimento: 'Atendimento',
  gestao: 'Gestão',
  financeiro: 'Financeiro',
  producao: 'Produção',
  cliente_externo: 'Cliente/externo',
}

export default function Usuarios() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState('')
  const current = pb.authStore.record
  const isAdmin = current?.papel === 'administrador'

  const load = async () => {
    try {
      const result = await pb.collection('users').getList(1, 100, { sort: 'name' })
      setUsers(result.items)
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar os usuários.')
    }
  }
  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin])

  const revoke = async (user: any) => {
    if (!window.confirm(`Revogar o acesso de ${user.name || user.email}?`)) return
    try {
      await pb.send(`/backend/v1/admin/users/${user.id}/revoke`, { method: 'POST', body: {} })
      await load()
    } catch (err: any) {
      setError(err.message || 'Não foi possível revogar o usuário.')
    }
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto py-12">
          <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card p-6 text-center">
            <p role="alert" className="text-sm text-red-700">
              Você não tem permissão para consultar ou gerir usuários.
            </p>
            <Button
              className="mt-4 bg-[#5C4A32] text-white hover:bg-[#473926] text-xs rounded-xl"
              onClick={() => navigate('/')}
            >
              Voltar ao início
            </Button>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Gestão de Usuários"
      subtitle="Controle de perfis e acessos à plataforma Emília Bem-Casados"
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
        </div>

        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#E8DEC8]/50">
            <CardTitle className="font-serif text-title-min md:text-xl font-semibold text-[#5C4A32]">
              Usuários do Sistema
            </CardTitle>
            <p className="text-xs text-[#8A7A66]">
              Senhas e tokens nunca são exibidos. A revogação de acessos é auditada.
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

        <div className="space-y-3">
          {users.map((user) => (
            <Card
              key={user.id}
              className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card hover:shadow-subtle transition-shadow overflow-hidden"
            >
              <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-[#5C4A32]">
                      {user.name || 'Sem nome'}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        user.ativo
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {user.ativo ? 'Ativo' : 'Revogado'}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A7A66] mt-0.5">{user.email}</p>
                  <p className="text-[11px] text-[#B08A3E] font-medium mt-1">
                    Perfil: {roleLabels[user.papel] || user.papel}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!user.ativo || user.id === current?.id}
                  onClick={() => revoke(user)}
                  className="border-red-200 text-red-700 hover:bg-red-50 text-xs rounded-xl flex items-center gap-1.5"
                >
                  <UserX size={14} />
                  Revogar acesso
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
