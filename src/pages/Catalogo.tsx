import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({
    codigo: '',
    nome: '',
    display_label: '',
    categoria: 'papel',
    source_document: '',
    source_version: '',
    source_locator: '',
    review_status: 'rascunho',
  })
  const canManage = ['administrador', 'gestao'].includes(pb.authStore.record?.papel)

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

  const openNew = () => {
    setEditing(null)
    setDraft({
      codigo: '',
      nome: '',
      display_label: '',
      categoria: 'papel',
      source_document: '',
      source_version: '',
      source_locator: '',
      review_status: 'rascunho',
    })
  }

  const openEdit = (item) => {
    setEditing(item)
    setDraft({
      codigo: item.codigo || '',
      nome: item.nome || '',
      display_label: item.display_label || '',
      categoria: item.categoria || 'papel',
      source_document: item.source_document || '',
      source_version: item.source_version || '',
      source_locator: item.source_locator || '',
      review_status: item.review_status || 'rascunho',
    })
  }

  const saveItem = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const data = { ...draft, display_label: draft.display_label || draft.nome }
      if (editing) await pb.collection('catalogo_itens').update(editing.id, data)
      else await pb.collection('catalogo_itens').create(data)
      const result = await pb.collection('catalogo_itens').getList(1, 200, { sort: '-created' })
      setItems(result.items)
      setEditing(null)
      setDraft({
        codigo: '',
        nome: '',
        display_label: '',
        categoria: 'papel',
        source_document: '',
        source_version: '',
        source_locator: '',
        review_status: 'rascunho',
      })
    } catch (err) {
      setError(err.message || 'Não foi possível salvar o item.')
    }
  }

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
            {canManage && (
              <form
                onSubmit={saveItem}
                className="rounded-md border border-[#C69D5F] bg-[#F5EEE7] p-4 space-y-3"
              >
                <h2 className="font-semibold text-[#3D2314]">
                  {editing ? 'Editar item' : 'Novo item'}
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="catalogo-codigo">Código</Label>
                    <Input
                      id="catalogo-codigo"
                      value={draft.codigo}
                      onChange={(e) => setDraft({ ...draft, codigo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="catalogo-nome">Nome</Label>
                    <Input
                      id="catalogo-nome"
                      required
                      value={draft.nome}
                      onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="catalogo-label">Label de exibição</Label>
                    <Input
                      id="catalogo-label"
                      value={draft.display_label}
                      onChange={(e) => setDraft({ ...draft, display_label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="catalogo-categoria">Categoria</Label>
                    <select
                      id="catalogo-categoria"
                      value={draft.categoria}
                      onChange={(e) => setDraft({ ...draft, categoria: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="papel">Papel</option>
                      <option value="fita">Fita</option>
                      <option value="sabor">Sabor</option>
                      <option value="caixinha">Caixinha</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="catalogo-fonte">Documento fonte</Label>
                    <Input
                      id="catalogo-fonte"
                      value={draft.source_document}
                      onChange={(e) => setDraft({ ...draft, source_document: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="catalogo-versao">Versão da fonte</Label>
                    <Input
                      id="catalogo-versao"
                      value={draft.source_version}
                      onChange={(e) => setDraft({ ...draft, source_version: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="catalogo-localizador">Localizador</Label>
                    <Input
                      id="catalogo-localizador"
                      value={draft.source_locator}
                      onChange={(e) => setDraft({ ...draft, source_locator: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-[#C69D5F] text-white">
                    Salvar item
                  </Button>
                  {editing && (
                    <Button type="button" variant="outline" onClick={openNew}>
                      Cancelar edição
                    </Button>
                  )}
                </div>
              </form>
            )}
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
                {canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => openEdit(item)}
                  >
                    Editar item
                  </Button>
                )}
                {item.review_status === 'rascunho' && (
                  <p className="mt-4 text-sm text-[#7A2E2E]">
                    Este item não pode ser tratado como opção aprovada sem código, fonte e versão.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>{' '}
    </div>
  )
}

export default Catalogo
