import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'

export default function Historico() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    pb.collection('historico_eventos')
      .getList(1, 100, { sort: '-created', expand: 'autor,oportunidade_id' })
      .then((result) => setItems(result.items))
      .catch((err) => setError(err.message || 'Não foi possível carregar o histórico.'))
  }, [])

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
                  <p className="font-semibold text-[#3D2314]">{item.tipo_evento}</p>
                  <p className="text-sm">{item.descricao}</p>
                  {item.campo && (
                    <p className="text-xs text-gray-600">
                      Campo: {item.campo} · Origem: {item.origem || 'não informada'}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-600 md:text-right">
                  <p>Ator: {item.expand?.autor?.name || item.autor || 'não informado'}</p>
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
