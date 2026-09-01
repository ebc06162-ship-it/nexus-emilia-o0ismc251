import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'

const roleLabels = {
  administrador: 'Administrador',
  gestao: 'Gestão',
  atendimento: 'Atendimento',
  financeiro: 'Financeiro',
  producao: 'Produção',
  cliente_externo: 'Cliente/externo',
}
const actionLabel = {
  criacao: 'Criação',
  edicao: 'Edição',
  revogacao: 'Revogação',
  acesso: 'Acesso',
  exclusao: 'Exclusão',
}
const objectLabel = {
  clientes: 'Cliente',
  oportunidades: 'Oportunidade/pedido',
  catalogo_itens: 'Item de catálogo',
  users: 'Usuário',
  historico_eventos: 'Histórico',
  auditoria: 'Auditoria',
}

export default function Historico() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
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
      <div className="min-h-screen bg-[#FAF8F5] p-8">
        <Card>
          <CardContent className="p-6">
            <p role="alert" className="text-[#7A2E2E]">
              Você não tem permissão para consultar o histórico.
            </p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const resultLabel = (r) => (r === 'permitido' ? 'Permitida' : r === 'negado' ? 'Negada' : 'Falha')

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="bg-[#3D2314] text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#DCC39E]">Nexus Emília</p>
            <h1 className="text-2xl font-semibold">Histórico de auditoria</h1>
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
            <CardTitle>Eventos registrados</CardTitle>
            <p className="text-sm text-gray-600">
              Consulta somente leitura. Registros não podem ser alterados ou excluídos.
            </p>
          </CardHeader>
        </Card>
        {error && (
          <p role="alert" className="text-[#7A2E2E]">
            {error}
          </p>
        )}
        {!error && items.length === 0 && (
          <p className="text-gray-600">Nenhum evento registrado ainda.</p>
        )}
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-1 md:flex-row md:justify-between">
                <div>
                  <p className="font-semibold text-[#3D2314]">
                    {item.descricao ||
                      `${actionLabel[item.acao] || item.acao} · ${objectLabel[item.objeto_tipo] || item.objeto_tipo}`}{' '}
                    · {resultLabel(item.resultado)}
                  </p>
                  <p className="text-sm text-gray-700">
                    {item.objeto_tipo}
                    {item.objeto_id ? ` · ${item.objeto_id}` : ''}
                  </p>
                  <p className="text-xs text-gray-600">
                    Motivo: {item.motivo || 'não informado'} · Origem:{' '}
                    {item.origem || 'não informada'}
                  </p>
                </div>
                <div className="text-xs text-gray-600 md:text-right">
                  <p>Ator: {item.ator_nome || 'não informado'}</p>
                  <p>Papel: {roleLabels[item.papel] || item.papel || 'não informado'}</p>
                  <p>{new Date(item.created).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}
