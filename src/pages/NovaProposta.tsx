import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'
import AppShell from '@/components/AppShell'
import { ArrowLeft } from 'lucide-react'

const tipos = [
  ['cumulativo', 'Cumulativo'],
  ['alternativa', 'Alternativa'],
  ['servico', 'Serviço'],
  ['observacao', 'Observação'],
]

const emptyItem = {
  catalogo_item_id: '',
  quantidade: 1,
  tipo: 'cumulativo',
  grupo_alternativa: '',
  ordem: 1,
}

export default function NovaProposta() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [oportunidades, setOportunidades] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [politicas, setPoliticas] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [oportunidadeId, setOportunidadeId] = useState('')
  const [itens, setItens] = useState([])
  const [novoItem, setNovoItem] = useState(emptyItem)
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    Promise.all([
      pb.collection('clientes').getList(1, 200, { sort: 'nome' }),
      pb.collection('oportunidades').getList(1, 200, { sort: '-created', expand: 'cliente_id' }),
      pb
        .collection('catalogo_itens')
        .getList(1, 200, { filter: 'review_status = "aprovado"', sort: 'categoria,display_label' }),
      pb
        .collection('politicas_comerciais')
        .getList(1, 200, { filter: 'estado = "aprovada"', sort: '-created' }),
    ])
      .then(([c, o, cat, pol]) => {
        const agora = Date.now()
        setClientes(c.items)
        setOportunidades(o.items)
        setCatalogo(cat.items)
        setPoliticas(
          pol.items.filter((policy: any) => {
            const inicio = Date.parse(String(policy.vigencia_inicio || ''))
            const fim = Date.parse(String(policy.vigencia_fim || ''))
            return (
              String(policy.versao || '').trim() &&
              String(policy.fonte || '').trim() &&
              String(policy.aprovador || '').trim() &&
              String(policy.vigencia_inicio || '').trim() &&
              String(policy.vigencia_fim || '').trim() &&
              String(policy.alcada || '').trim() &&
              Number.isFinite(inicio) &&
              Number.isFinite(fim) &&
              inicio <= agora &&
              fim >= agora
            )
          }),
        )
      })
      .catch((err) => setError(err.message || 'Não foi possível carregar os dados.'))
      .finally(() => setLoading(false))
  }, [])

  const oportunidadesVisiveis = useMemo(
    () => (clienteId ? oportunidades.filter((o) => o.cliente_id === clienteId) : oportunidades),
    [clienteId, oportunidades],
  )

  const addItem = () => {
    const catalogoItem = catalogo.find((item) => item.id === novoItem.catalogo_item_id)
    if (!catalogoItem) return setError('Selecione um item aprovado do catálogo.')
    if (novoItem.tipo === 'alternativa' && !novoItem.grupo_alternativa.trim()) {
      return setError('Informe o grupo da alternativa, por exemplo: embalagem.')
    }
    setItens((current) => [
      ...current,
      {
        ...novoItem,
        ordem: current.length + 1,
        codigo_snapshot: catalogoItem.codigo || '',
        label_snapshot: catalogoItem.display_label,
        catalogo_versao_snapshot: catalogoItem.source_version || '',
        composicao_snapshot: {
          categoria: catalogoItem.categoria,
          tipo: catalogoItem.tipo || '',
          variante: catalogoItem.variante || '',
          cor: catalogoItem.cor || '',
          largura: catalogoItem.largura || '',
        },
      },
    ])
    setNovoItem(emptyItem)
    setError('')
  }

  const removeItem = (index) =>
    setItens((current) =>
      current.filter((_, i) => i !== index).map((item, i) => ({ ...item, ordem: i + 1 })),
    )

  const alternatives = useMemo(() => itens.filter((item) => item.tipo === 'alternativa'), [itens])
  const groups = useMemo(
    () => [...new Set(alternatives.map((item) => item.grupo_alternativa))],
    [alternatives],
  )

  const saveDraft = async (status = 'rascunho') => {
    setError('')
    if (!clienteId || !oportunidadeId) return setError('Selecione cliente e oportunidade.')
    if (!itens.length) return setError('Adicione pelo menos um item ao orçamento.')
    if (status !== 'rascunho' && !politicas.length) {
      return setError('Não é possível revisar: não há política comercial aprovada e vigente.')
    }
    const oportunidade = oportunidades.find((item) => item.id === oportunidadeId)
    const politicaSelecionada = status !== 'rascunho' ? politicas[0] : null
    const politicaSnapshot = politicaSelecionada
      ? {
          id: politicaSelecionada.id,
          nome: politicaSelecionada.nome || '',
          tipo: politicaSelecionada.tipo || '',
          versao: politicaSelecionada.versao || '',
          moeda: politicaSelecionada.moeda || '',
          vigencia_inicio: politicaSelecionada.vigencia_inicio || '',
          vigencia_fim: politicaSelecionada.vigencia_fim || '',
          fonte: politicaSelecionada.fonte || '',
          aprovador: politicaSelecionada.aprovador || '',
          estado: politicaSelecionada.estado || '',
          alcada: politicaSelecionada.alcada || '',
          precedencia: politicaSelecionada.precedencia ?? null,
          formula_ou_valor: politicaSelecionada.formula_ou_valor ?? null,
        }
      : null
    setSaving(true)
    try {
      const proposta = await pb.collection('propostas').create({
        cliente_id: clienteId,
        oportunidade_id: oportunidadeId,
        versao: 1,
        status,
        moeda: 'BRL',
        politica_id: politicaSelecionada?.id || '',
        politica_versao_snapshot: politicaSnapshot?.versao || '',
        tabela_comercial_snapshot: {
          estado: 'pendente',
          observacao: 'Tabela/preço não calculados nesta task.',
        },
        condicoes_snapshot: {
          origem: 'montador_f2_t006',
          politica_aplicada: Boolean(politicaSnapshot),
          politica_snapshot: politicaSnapshot,
        },
        criada_por: pb.authStore.record.id,
        observacoes: observacoes || 'Orçamento criado pelo montador.',
      })
      for (const item of itens) {
        await pb.collection('itens_proposta').create({ proposta_id: proposta.id, ...item })
      }
      await pb.collection('auditoria_propostas').create({
        proposta_id: proposta.id,
        tipo_evento: 'criacao',
        autor: pb.authStore.record.id,
        versao: 1,
        resumo: `Orçamento criado com ${itens.length} item(ns); ${groups.length} grupo(s) de alternativa.`,
        depois_snapshot: { cliente_id: clienteId, oportunidade_id: oportunidadeId, itens },
      })
      setSaved(proposta)
    } catch (err) {
      setError(err.message || 'Não foi possível salvar o orçamento.')
    } finally {
      setSaving(false)
    }
  }

  const responderProposta = async (acao) => {
    if (!saved) return
    setError('')
    setSaving(true)
    try {
      const resposta = await pb.send(`/backend/v1/propostas/${saved.id}/resposta`, {
        method: 'POST',
        body: { acao },
      })
      setSaved((current) => ({
        ...current,
        id: resposta.proposta_id || current.id,
        versao: resposta.versao || current.versao,
        status: resposta.status,
        pedido_id: resposta.pedido_id || current.pedido_id,
      }))
    } catch (err) {
      setError(err.message || 'Não foi possível responder ao orçamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      title="Orçamentos"
      subtitle="Composição de itens aprovados do catálogo e amarração à política comercial"
    >
      <div className="space-y-5 w-full mx-auto">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] text-sm rounded-xl flex items-center gap-1.5"
          >
            <ArrowLeft size={16} />
            Voltar ao painel
          </Button>
        </div>
        {loading && <p className="text-base text-[#8A7A66]">Carregando dados aprovados...</p>}
        {error && (
          <p role="alert" className="text-base text-[#7A2E2E]">
            {error}
          </p>
        )}
        {saved && (
          <Card className="border-green-700">
            <CardContent className="p-4 md:p-5 space-y-3">
              <p className="font-semibold text-lg text-green-800">Orçamento registrado</p>
              <p className="text-base">
                Orçamento {saved.id}, versão {saved.versao}. Nenhum preço foi calculado.
              </p>
              <p className="text-base">
                Status comercial: <strong>{saved.status}</strong>
                {saved.pedido_id ? ` · Pedido: ${saved.pedido_id}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => responderProposta('aprovar')}
                  className="bg-[#5C4A32] hover:bg-[#473926] text-white text-[15px] rounded-xl px-4 py-2"
                >
                  Aprovar e converter em pedido
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  variant="outline"
                  onClick={() => responderProposta('devolver')}
                  className="border-[#E8DEC8] text-[#5C4A32] text-[15px] rounded-xl px-4 py-2"
                >
                  Devolver orçamento para alteração
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  variant="outline"
                  onClick={() => responderProposta('recusar')}
                  className="border-red-200 text-red-700 text-[15px] rounded-xl px-4 py-2"
                >
                  Recusar orçamento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-title-min md:text-2xl font-semibold text-[#5C4A32]">
              1. Contexto do orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cliente" className="text-[15px] font-semibold text-[#5C4A32]">
                Cliente
              </Label>
              <select
                id="cliente"
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value)
                  setOportunidadeId('')
                }}
                className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-[#FDFAF5] px-3.5 py-2 text-[15px] text-[#5C4A32]"
              >
                <option value="">Selecione</option>
                {clientes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oportunidade" className="text-[15px] font-semibold text-[#5C4A32]">
                Oportunidade
              </Label>
              <select
                id="oportunidade"
                value={oportunidadeId}
                onChange={(e) => setOportunidadeId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-[#FDFAF5] px-3.5 py-2 text-[15px] text-[#5C4A32]"
              >
                <option value="">Selecione</option>
                {oportunidadesVisiveis.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.tipo_evento || o.tipo_pedido || 'Oportunidade'} · {o.status}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-title-min md:text-2xl font-semibold text-[#5C4A32]">
              2. Itens do orçamento
            </CardTitle>
            <p className="text-sm md:text-base text-[#8A7A66]">
              Itens aprovados do catálogo. Alternativas do mesmo grupo não são somadas.{' '}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-5 items-end">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="item" className="text-[15px] font-semibold text-[#5C4A32]">
                  Item aprovado
                </Label>
                <select
                  id="item"
                  value={novoItem.catalogo_item_id}
                  onChange={(e) => setNovoItem({ ...novoItem, catalogo_item_id: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-[#FDFAF5] px-3.5 py-2 text-[15px] text-[#5C4A32]"
                >
                  <option value="">Selecione</option>
                  {catalogo.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.codigo || 'Sem código'} · {item.display_label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tipo" className="text-[15px] font-semibold text-[#5C4A32]">
                  Tipo
                </Label>
                <select
                  id="tipo"
                  value={novoItem.tipo}
                  onChange={(e) => setNovoItem({ ...novoItem, tipo: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-[#FDFAF5] px-3.5 py-2 text-[15px] text-[#5C4A32]"
                >
                  {tipos.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantidade" className="text-[15px] font-semibold text-[#5C4A32]">
                  Quantidade
                </Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={novoItem.quantidade}
                  onChange={(e) => setNovoItem({ ...novoItem, quantidade: Number(e.target.value) })}
                  className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-[15px] h-10 px-3.5"
                />
              </div>
              <Button
                type="button"
                onClick={addItem}
                className="bg-[#5C4A32] text-white hover:bg-[#473926] text-sm md:text-[15px] rounded-xl h-10 px-4"
              >
                Adicionar
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grupo" className="text-[15px] font-semibold text-[#5C4A32]">
                Grupo de alternativa (obrigatório para alternativa)
              </Label>
              <Input
                id="grupo"
                value={novoItem.grupo_alternativa}
                onChange={(e) => setNovoItem({ ...novoItem, grupo_alternativa: e.target.value })}
                placeholder="Ex.: embalagem"
                className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-[15px] h-10 px-3.5"
              />
            </div>
            <div className="space-y-2">
              {!itens.length && <p className="text-sm text-[#8A7A66]">Nenhum item adicionado.</p>}
              {itens.map((item: any, index: number) => (
                <div
                  key={`${item.catalogo_item_id}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-[#E8DEC8] bg-[#FBF7F0] p-3.5"
                >
                  <div>
                    <p className="font-semibold text-sm md:text-base text-[#5C4A32]">
                      {item.label_snapshot}
                    </p>
                    <p className="text-xs md:text-sm text-[#8A7A66]">
                      {item.tipo} · quantidade{' '}
                      <span className="font-data tabular-nums font-semibold">
                        {item.quantidade}
                      </span>
                      {item.grupo_alternativa ? ` · grupo: ${item.grupo_alternativa}` : ''} ·
                      catálogo {item.catalogo_versao_snapshot || 'sem versão'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="border-[#E8DEC8] text-[#5C4A32] text-sm rounded-xl px-3 py-1.5"
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
            {groups.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-[#8A7A66] font-medium">Grupos exclusivos:</span>
                {groups.map((group) => (
                  <Badge
                    key={group}
                    variant="outline"
                    className="border-[#D6BC7E] text-[#5C4A32] bg-[#F4EEDA] text-xs px-2.5 py-1"
                  >
                    {group}:{' '}
                    {alternatives.filter((item: any) => item.grupo_alternativa === group).length}{' '}
                    opções
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-title-min md:text-2xl font-semibold text-[#5C4A32]">
              3. Revisão e política
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base text-[#5C4A32]">
              Políticas aprovadas disponíveis: <strong>{politicas.length}</strong>
            </p>
            {!politicas.length && (
              <p className="rounded-xl bg-[#F4EEDA] border border-[#E5D7B7] p-3 text-sm text-[#8A7A66]">
                O orçamento pode ser salvo como rascunho, mas a revisão/emissão está bloqueada até
                existir política aprovada e vigente. Nenhum valor será calculado silenciosamente.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="observacoes" className="text-[15px] font-semibold text-[#5C4A32]">
                Observações
              </Label>
              <Input
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações da revisão"
                className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-[15px] h-10 px-3.5"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => saveDraft('rascunho')}
                className="border-[#E8DEC8] text-[#5C4A32] text-sm rounded-xl px-4 py-2"
              >
                Salvar rascunho
              </Button>
              <Button
                type="button"
                disabled={saving || !politicas.length}
                onClick={() => saveDraft('em_revisao')}
                className="bg-[#5C4A32] hover:bg-[#473926] text-white text-sm rounded-xl px-4 py-2"
              >
                Enviar para revisão
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
