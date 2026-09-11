import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import AppShell from '@/components/AppShell'
import { ArrowLeft, Plus, Search, Tag, CheckCircle2, AlertTriangle } from 'lucide-react'

const statusLabel: Record<string, string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
  conflito: 'Conflito',
  inativo: 'Inativo',
}
const categoryLabel: Record<string, string> = {
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

const emptyDraft = {
  codigo: '',
  nome: '',
  display_label: '',
  categoria: 'papel',
  source_document: '',
  source_version: '',
  source_locator: '',
  review_status: 'rascunho',
}

export default function Catalogo() {
  const navigate = useNavigate()
  const [items, setItems] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const canManage = ['administrador', 'gestao'].includes(pb.authStore.record?.papel)

  const load = async () => {
    const result = await pb.collection('catalogo_itens').getList(1, 200, { sort: '-created' })
    setItems(result.items)
  }
  useEffect(() => {
    load()
      .then(() => setLoading(false))
      .catch((err) => {
        setLoading(false)
        setError(err.message || 'Não foi possível carregar o catálogo.')
      })
  }, [])

  const openNew = () => {
    setEditing(null)
    setDraft(emptyDraft)
  }
  const openEdit = (item: any) => {
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

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      const data = { ...draft, display_label: draft.display_label || draft.nome }
      if (editing) await pb.collection('catalogo_itens').update(editing.id, data)
      else await pb.collection('catalogo_itens').create(data)
      await load()
      setEditing(null)
      setDraft(emptyDraft)
    } catch (err: any) {
      if ((err?.status === 403 || err?.status === 400) && pb.authStore.isValid && !canManage) {
        try {
          await pb.send('/backend/v1/auditoria/negacao', {
            method: 'POST',
            body: {
              objeto_tipo: 'catalogo_itens',
              acao: editing ? 'edição' : 'criação',
              origem: 'catalogo',
            },
          })
        } catch (auditError) {
          console.warn('Não foi possível registrar a tentativa negada', auditError)
        }
      }
      setError(err.message || 'Não foi possível salvar o item.')
    }
  }

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
        (acc: any, item) => ({ ...acc, [item.review_status]: (acc[item.review_status] || 0) + 1 }),
        {},
      ),
    [items],
  )

  return (
    <AppShell
      title="Catálogo de Produtos & Acabamentos"
      subtitle="Opções canônicas aprovadas pela Emília Bem-Casados para propostas e pedidos"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] text-sm rounded-xl flex items-center gap-1.5 px-4 py-2"
          >
            <ArrowLeft size={16} />
            Voltar ao painel
          </Button>

          {canManage && (
            <Button
              onClick={openNew}
              className="bg-[#5C4A32] hover:bg-[#473926] text-[#FDFAF5] text-sm rounded-xl flex items-center gap-1.5 px-4 py-2"
            >
              <Plus size={16} />
              Novo Item
            </Button>
          )}
        </div>

        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#E8DEC8]/50">
            <CardTitle className="font-serif text-title-min md:text-2xl font-semibold text-[#5C4A32]">
              Opções Internas Aprovadas
            </CardTitle>
            <p className="text-xs md:text-sm text-[#8A7A66]">
              Fornecedores são apenas fundamento técnico interno. Esta tela exibe somente itens e
              nomes canônicos do catálogo da Emília.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {canManage && (editing || draft.nome) && (
              <form
                onSubmit={saveItem}
                className="rounded-2xl border border-[#D6BC7E] bg-[#F8F3EA] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg md:text-xl font-semibold text-[#5C4A32]">
                    {editing ? 'Editar item do catálogo' : 'Novo item do catálogo'}
                  </h3>
                  <span className="text-xs text-[#8A7A66] uppercase font-sans tracking-[0.18em] font-semibold">
                    Formulário de gestão
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="catalogo-codigo"
                      className="text-[15px] font-semibold text-[#5C4A32]"
                    >
                      Código
                    </Label>
                    <Input
                      id="catalogo-codigo"
                      value={draft.codigo}
                      onChange={(e) => setDraft({ ...draft, codigo: e.target.value })}
                      className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-[15px] h-10 px-3.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="catalogo-nome"
                      className="text-[15px] font-semibold text-[#5C4A32]"
                    >
                      Nome *
                    </Label>
                    <Input
                      id="catalogo-nome"
                      required
                      value={draft.nome}
                      onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
                      className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-[15px] h-10 px-3.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="catalogo-label"
                      className="text-[15px] font-semibold text-[#5C4A32]"
                    >
                      Label de exibição
                    </Label>
                    <Input
                      id="catalogo-label"
                      value={draft.display_label}
                      onChange={(e) => setDraft({ ...draft, display_label: e.target.value })}
                      className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-[15px] h-10 px-3.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="catalogo-categoria"
                      className="text-[15px] font-semibold text-[#5C4A32]"
                    >
                      Categoria
                    </Label>
                    <select
                      id="catalogo-categoria"
                      value={draft.categoria}
                      onChange={(e) => setDraft({ ...draft, categoria: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-[#FDFAF5] px-3.5 py-2 text-[15px] text-[#5C4A32]"
                    >
                      <option value="papel">Papel</option>
                      <option value="fita">Fita</option>
                      <option value="sabor">Sabor</option>
                      <option value="caixinha">Caixinha</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="catalogo-fonte"
                      className="text-[15px] font-semibold text-[#5C4A32]"
                    >
                      Documento fonte
                    </Label>
                    <Input
                      id="catalogo-fonte"
                      value={draft.source_document}
                      onChange={(e) => setDraft({ ...draft, source_document: e.target.value })}
                      className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-[15px] h-10 px-3.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="catalogo-versao"
                      className="text-[15px] font-semibold text-[#5C4A32]"
                    >
                      Versão da fonte
                    </Label>
                    <Input
                      id="catalogo-versao"
                      value={draft.source_version}
                      onChange={(e) => setDraft({ ...draft, source_version: e.target.value })}
                      className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-[15px] h-10 px-3.5"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label
                      htmlFor="catalogo-localizador"
                      className="text-[15px] font-semibold text-[#5C4A32]"
                    >
                      Localizador
                    </Label>
                    <Input
                      id="catalogo-localizador"
                      value={draft.source_locator}
                      onChange={(e) => setDraft({ ...draft, source_locator: e.target.value })}
                      className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-[15px] h-10 px-3.5"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    className="bg-[#5C4A32] text-white hover:bg-[#473926] text-[15px] rounded-xl px-5 py-2"
                  >
                    Salvar item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openNew}
                    className="border-[#E8DEC8] text-[#5C4A32] text-[15px] rounded-xl px-4 py-2"
                  >
                    Limpar
                  </Button>
                </div>
              </form>
            )}

            {/* Barra de busca arredondada */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7A66]/70 pointer-events-none"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por código, nome, categoria ou cor..."
                aria-label="Buscar no catálogo"
                className="pl-11 rounded-full bg-[#FDFAF5] border-[#E8DEC8] text-[15px] h-10 py-2 text-[#5C4A32] focus:border-[#B08A3E] focus:ring-[#B08A3E]/30"
              />
            </div>

            {/* Badges de contagem estilo suave */}
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3.5 py-1.5 rounded-full bg-[#F4EEDA] text-[#5C4A32] border border-[#E5D7B7] text-xs font-medium">
                Total: <span className="font-data tabular-nums font-semibold">{items.length}</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                Aprovados:{' '}
                <span className="font-data tabular-nums font-semibold">{counts.aprovado || 0}</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                Rascunhos:{' '}
                <span className="font-data tabular-nums font-semibold">{counts.rascunho || 0}</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
                Conflitos:{' '}
                <span className="font-data tabular-nums font-semibold">{counts.conflito || 0}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {loading && <p className="text-xs text-[#8A7A66]">Carregando catálogo...</p>}
        {error && (
          <p
            role="alert"
            className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200"
          >
            {error}
          </p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-xs text-[#8A7A66] py-6 text-center">Nenhum item encontrado.</p>
        )}

        <div className="grid gap-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card hover:shadow-subtle transition-shadow overflow-hidden"
            >
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-data tabular-nums text-sm text-[#8A7A66] bg-[#F4EEDA] px-2.5 py-0.5 rounded-md border border-[#E5D7B7]">
                        {item.codigo || 'Sem código'}
                      </span>
                      <span
                        className={`px-3 py-0.5 rounded-full text-xs font-medium border ${
                          item.review_status === 'aprovado'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {statusLabel[item.review_status] || item.review_status}
                      </span>
                      <span className="px-3 py-0.5 rounded-full text-xs font-medium bg-[#EFE8DC] text-[#5C4A32] border border-[#DDD0BC]">
                        {categoryLabel[item.categoria] || item.categoria}
                      </span>
                    </div>

                    <h2 className="font-serif text-title-min md:text-2xl font-semibold text-[#5C4A32]">
                      {item.display_label}
                    </h2>
                    <p className="text-sm text-[#8A7A66] mt-0.5">
                      {item.tipo || 'Tipo não informado'}
                      {item.cor ? ` · ${item.cor}` : ''}
                      {item.largura ? ` · ${item.largura}` : ''}
                    </p>
                  </div>

                  <div className="text-xs md:text-sm text-[#8A7A66] md:text-right space-y-0.5 bg-[#FBF7F0] p-3 rounded-xl border border-[#E8DEC8]/60">
                    <p>
                      <strong>Fonte:</strong> {item.source_document || 'Não informada'}
                    </p>
                    <p>
                      <strong>Versão:</strong> {item.source_version || 'Não informada'}
                    </p>
                    <p>
                      <strong>Localizador:</strong> {item.source_locator || 'Não informado'}
                    </p>
                  </div>
                </div>

                {canManage && (
                  <div className="mt-3 pt-3 border-t border-[#E8DEC8]/60 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(item)}
                      className="border-[#D6BC7E] text-[#5C4A32] hover:bg-[#F4EEDA] text-sm rounded-xl px-3.5 py-1.5"
                    >
                      Editar item
                    </Button>
                  </div>
                )}

                {item.review_status === 'rascunho' && (
                  <p className="mt-2 text-[11px] text-[#A6792E] flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Este item não pode ser tratado como opção aprovada sem código, fonte e versão.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
