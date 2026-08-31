import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import pb from '@/lib/pocketbase/client'

const statusLabel = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
  conflito: 'Conflito',
  inativo: 'Inativo',
}

const categoryLabel = {
  produto: 'Produto',
  sabor: 'Sabor',
  papel: 'Papel',
  cor_papel: 'Cor do papel',
  tecido: 'Tecido',
  fita: 'Fita',
  largura_fita: 'Largura da fita',
  cor_fita: 'Cor da fita',
  modelo_laco: 'Modelo de laço',
  acessorio: 'Acessório',
  caixinha: 'Caixinha',
  modelo_sem_fita: 'Modelo sem fita',
  outro: 'Outro',
}

const Catalogo = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const result = await pb.collection('catalogo_itens').getList(1, 200, { sort: '-created' })
        setItems(result.items)
      } catch (err) {
        setError(err.message || 'Não foi possível carregar o catálogo.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return items
    return items.filter((item) =>
      [item.codigo, item.nome, item.display_label, item.categoria, item.tipo, item.cor]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    )
  }, [items, query])

  const counts = useMemo(
    () =>
      items.reduce(
        (acc, item) => ({ ...acc, [item.review_status]: (acc[item.review_status] || 0) + 1 }),
        {},
      ),
    [items],
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="bg-[#3D2314] text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#DCC39E]">Nexus Emília</p>
            <h1 className="text-2xl font-semibold">Catálogo versionado</h1>
          </div>
          <Button
            variant="outline"
            className="text-white border-white hover:bg-white hover:text-[#3D2314]"
            onClick={() => navigate('/')}
          >
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Opções internas aprovadas pela Emília</CardTitle>
            <p className="text-sm text-gray-600">
              Fornecedores são apenas fundamento técnico interno. Esta tela exibe somente itens e
              nomes canônicos do catálogo da Emília.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por código, nome, categoria ou cor"
              aria-label="Buscar no catálogo"
            />
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">Total: {items.length}</Badge>
              <Badge variant="outline">Aprovados: {counts.aprovado || 0}</Badge>
              <Badge variant="outline">Rascunhos: {counts.rascunho || 0}</Badge>
              <Badge variant="outline">Conflitos: {counts.conflito || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        {loading && <p className="text-gray-600">Carregando catálogo...</p>}
        {error && (
          <p className="text-[#7A2E2E]" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-gray-600">Nenhum item encontrado.</p>
        )}

        <div className="grid gap-4">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-[#3D2314]">
                        {item.codigo || 'Sem código'}
                      </span>
                      <Badge variant={item.review_status === 'aprovado' ? 'default' : 'outline'}>
                        {statusLabel[item.review_status] || item.review_status}
                      </Badge>
                      <Badge variant="outline">
                        {categoryLabel[item.categoria] || item.categoria}
                      </Badge>
                    </div>
                    <h2 className="text-lg font-semibold text-[#3D2314]">{item.display_label}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.tipo || 'Tipo não informado'}
                      {item.cor ? ` · ${item.cor}` : ''}
                      {item.largura ? ` · ${item.largura}` : ''}
                    </p>
                  </div>
                  <div className="text-xs text-gray-600 md:text-right">
                    <p>Fonte: {item.source_document || 'Não informada'}</p>
                    <p>Versão: {item.source_version || 'Não informada'}</p>
                    <p>Localizador: {item.source_locator || 'Não informado'}</p>
                  </div>
                </div>
                {item.review_status === 'rascunho' && (
                  <p className="mt-4 text-sm text-[#7A2E2E]">
                    Este item não pode ser tratado como opção aprovada sem código, fonte e versão.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Catalogo
