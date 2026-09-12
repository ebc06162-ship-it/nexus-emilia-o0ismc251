import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import AppShell from '@/components/AppShell'
import { ArrowLeft, Check, Edit2, Plus, Search, UserPlus, X, AlertCircle } from 'lucide-react'

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
  const [oportunidades, setOportunidades] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [politicas, setPoliticas] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null)
  const [oportunidadeId, setOportunidadeId] = useState('')
  const [itens, setItens] = useState([])
  const [novoItem, setNovoItem] = useState(emptyItem)
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)

  // Estados de busca de cliente
  const [clienteBusca, setClienteBusca] = useState('')
  const [clientesFiltrados, setClientesFiltrados] = useState<any[]>([])
  const [buscandoClientes, setBuscandoClientes] = useState(false)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const buscaTimer = useRef<number | null>(null)
  const buscaClienteRef = useRef(0)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Estados para modal/inline de criação de novo cliente
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false)
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('')
  const [novoClienteCpf, setNovoClienteCpf] = useState('')
  const [novoClienteEmail, setNovoClienteEmail] = useState('')
  const [novoClienteNatureza, setNovoClienteNatureza] = useState('pessoa_fisica')
  const [novoClienteClassificacao, setNovoClienteClassificacao] = useState('cliente_padrao')
  const [novoClienteCriarOportunidade, setNovoClienteCriarOportunidade] = useState(true)
  const [salvandoNovoCliente, setSalvandoNovoCliente] = useState(false)
  const [modalClienteErro, setModalClienteErro] = useState('')

  // Estados para complementação / edição do cadastro completo do cliente selecionado
  const [showEditarCadastroModal, setShowEditarCadastroModal] = useState(false)
  const [editClienteNome, setEditClienteNome] = useState('')
  const [editClienteTelefone, setEditClienteTelefone] = useState('')
  const [editClienteCpf, setEditClienteCpf] = useState('')
  const [editClienteEmail, setEditClienteEmail] = useState('')
  const [editClienteNatureza, setEditClienteNatureza] = useState('pessoa_fisica')
  const [editClienteClassificacao, setEditClienteClassificacao] = useState('cliente_padrao')
  const [editClienteOrigem, setEditClienteOrigem] = useState('')
  const [editClienteCategoriaIndicacao, setEditClienteCategoriaIndicacao] = useState('')
  const [editClienteReferencia, setEditClienteReferencia] = useState('')
  const [editClienteObservacoes, setEditClienteObservacoes] = useState('')
  const [salvandoCadastroCliente, setSalvandoCadastroCliente] = useState(false)
  const [erroEditarCadastro, setErroEditarCadastro] = useState('')

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setDropdownAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (buscaTimer.current) window.clearTimeout(buscaTimer.current)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      pb.collection('oportunidades').getList(1, 200, { sort: '-created', expand: 'cliente_id' }),
      pb
        .collection('catalogo_itens')
        .getList(1, 200, { filter: 'review_status = "aprovado"', sort: 'categoria,display_label' }),
      pb
        .collection('politicas_comerciais')
        .getList(1, 200, { filter: 'estado = "aprovada"', sort: '-created' }),
    ])
      .then(([o, cat, pol]) => {
        const agora = Date.now()
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

  // Funções de busca de cliente (nome, telefone ou CPF)
  const buscarClientes = async (termo: string) => {
    const id = ++buscaClienteRef.current
    const raw = termo.trim()
    if (!raw) {
      setClientesFiltrados([])
      setBuscandoClientes(false)
      return
    }
    setBuscandoClientes(true)
    try {
      const safeName = raw.replace(/"/g, '\\"')
      const safeDigits = raw.replace(/\D/g, '')
      const parts = [`nome ~ "${safeName}"`]
      if (safeDigits.length >= 3) {
        parts.push(`telefone_principal ~ "${safeDigits}"`)
        parts.push(`cpf_cnpj ~ "${safeDigits}"`)
      }
      const r = await pb
        .collection('clientes')
        .getList(1, 10, { filter: `(${parts.join(' || ')})`, sort: 'nome' })
      if (id === buscaClienteRef.current) {
        setClientesFiltrados(r.items)
        setDropdownAberto(true)
      }
    } catch (err) {
      console.warn('Falha ao buscar clientes no orçamento', err)
    } finally {
      if (id === buscaClienteRef.current) setBuscandoClientes(false)
    }
  }

  const handleClienteBuscaChange = (value: string) => {
    setClienteBusca(value)
    if (buscaTimer.current) window.clearTimeout(buscaTimer.current)
    if (!value.trim()) {
      setClientesFiltrados([])
      setDropdownAberto(false)
      return
    }
    setDropdownAberto(true)
    buscaTimer.current = window.setTimeout(() => buscarClientes(value), 250)
  }

  const selecionarCliente = (cliente: any) => {
    setClienteSelecionado(cliente)
    setClienteId(cliente.id)
    setClienteBusca(cliente.nome)
    setErroEditarCadastro('')
    setClientesFiltrados([])
    setDropdownAberto(false)
    setOportunidadeId('')
  }

  const limparClienteSelecionado = () => {
    setClienteSelecionado(null)
    setClienteId('')
    setClienteBusca('')
    setErroEditarCadastro('')
    setOportunidadeId('')
    setClientesFiltrados([])
    setDropdownAberto(false)
  }

  const abrirModalNovoCliente = () => {
    const digitado = clienteBusca.trim()
    const safeDigits = digitado.replace(/\D/g, '')
    const ehTelefoneOuCpf = /^[0-9\s()+-]+$/.test(digitado) && safeDigits.length >= 10

    setNovoClienteNome(ehTelefoneOuCpf ? '' : digitado)
    setNovoClienteTelefone(
      ehTelefoneOuCpf && safeDigits.length <= 11 && !digitado.includes('.') ? digitado : '',
    )
    setNovoClienteCpf(
      ehTelefoneOuCpf && (digitado.includes('.') || safeDigits.length === 11) ? digitado : '',
    )
    setNovoClienteEmail('')
    setNovoClienteNatureza('pessoa_fisica')
    setNovoClienteClassificacao('cliente_padrao')
    setNovoClienteCriarOportunidade(true)
    setModalClienteErro('')
    setDropdownAberto(false)
    setShowNovoClienteModal(true)
  }

  const salvarNovoCliente = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setModalClienteErro('')
    const nomeLimpo = novoClienteNome.trim()
    const telLimpo = novoClienteTelefone.replace(/\D/g, '')

    if (!nomeLimpo) {
      return setModalClienteErro('Informe o nome do cliente.')
    }
    const partesNome = nomeLimpo.split(/\s+/).filter(Boolean)
    if (partesNome.length < 2) {
      return setModalClienteErro('Informe ao menos nome e sobrenome do cliente.')
    }
    if (telLimpo && telLimpo.length < 10) {
      return setModalClienteErro('Telefone inválido (deve conter DDD + número).')
    }

    setSalvandoNovoCliente(true)
    try {
      const clienteData: Record<string, any> = {
        nome: nomeLimpo,
        situacao: 'ativo',
        natureza_cadastral: novoClienteNatureza,
        classificacao_comercial: novoClienteClassificacao,
      }
      if (telLimpo) clienteData.telefone_principal = telLimpo
      if (novoClienteEmail.trim()) clienteData.email = novoClienteEmail.trim()
      if (novoClienteCpf.trim()) clienteData.cpf_cnpj = novoClienteCpf.trim()

      const clienteCriado = await pb.collection('clientes').create(clienteData)

      // Se tiver telefone, cria/vincula pessoa auxiliar se cabível
      if (telLimpo) {
        try {
          let pessoa: any = null
          const buscaPessoa = await pb
            .collection('pessoas')
            .getList(1, 1, { filter: `telefone_principal = "${telLimpo}"` })
          pessoa = buscaPessoa.items[0] || null
          if (!pessoa) {
            pessoa = await pb.collection('pessoas').create({
              nome: nomeLimpo,
              telefone_principal: telLimpo,
              ...(novoClienteEmail.trim() ? { email: novoClienteEmail.trim() } : {}),
              ...(novoClienteCpf.trim() ? { cpf: novoClienteCpf.trim() } : {}),
            })
          }
          if (pessoa) {
            await pb
              .collection('clientes_pessoas')
              .create({ cliente_id: clienteCriado.id, pessoa_id: pessoa.id, papel: 'titular' })
          }
        } catch (subErr) {
          console.warn('Aviso: vínculo auxiliar de pessoa não concluído', subErr)
        }
      }

      // Se marcado para criar oportunidade inicial, já cria e associa
      let novaOportunidadeCriada: any = null
      if (novoClienteCriarOportunidade) {
        try {
          novaOportunidadeCriada = await pb.collection('oportunidades').create({
            cliente_id: clienteCriado.id,
            tipo_pedido: 'outros',
            tipo_evento: 'outros',
            segmento: 'outros',
            segmento_classificado: 'outros',
            status: 'novo',
            observacoes: 'Oportunidade gerada na criação do orçamento.',
            responsavel_atual: pb.authStore.record?.id || '',
          })
          setOportunidades((curr) => [novaOportunidadeCriada, ...curr])
        } catch (opErr) {
          console.warn('Não foi possível auto-criar oportunidade', opErr)
        }
      }

      // Vincula cliente criado ao orçamento em construção
      setClienteSelecionado(clienteCriado)
      setClienteId(clienteCriado.id)
      setClienteBusca(clienteCriado.nome)
      setErroEditarCadastro('')
      if (novaOportunidadeCriada) {
        setOportunidadeId(novaOportunidadeCriada.id)
      } else {
        setOportunidadeId('')
      }
      setShowNovoClienteModal(false)
    } catch (err: any) {
      setModalClienteErro(err.message || 'Não foi possível cadastrar o cliente.')
    } finally {
      setSalvandoNovoCliente(false)
    }
  }

  // Validação suave de nome completo (pelo menos duas palavras)
  const isNomeCompleto = (name: string) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean)
    return parts.length >= 2
  }

  // Abrir modal de edição/complementação do cadastro completo do cliente
  const abrirModalEditarCadastro = () => {
    if (!clienteSelecionado) return
    setEditClienteNome(clienteSelecionado.nome || '')
    setEditClienteTelefone(clienteSelecionado.telefone_principal || '')
    setEditClienteCpf(clienteSelecionado.cpf_cnpj || '')
    setEditClienteEmail(clienteSelecionado.email || '')
    setEditClienteNatureza(clienteSelecionado.natureza_cadastral || 'pessoa_fisica')
    setEditClienteClassificacao(clienteSelecionado.classificacao_comercial || 'cliente_padrao')
    setEditClienteOrigem(clienteSelecionado.origem_cliente || '')
    setEditClienteCategoriaIndicacao(clienteSelecionado.categoria_indicacao || '')
    setEditClienteReferencia(clienteSelecionado.referencia_origem || '')
    setEditClienteObservacoes(clienteSelecionado.observacoes || '')
    setErroEditarCadastro('')
    setShowEditarCadastroModal(true)
  }

  // Complementar / salvar edição do cadastro completo do cliente selecionado
  const salvarEditarCadastro = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setErroEditarCadastro('')
    const nomeLimpo = editClienteNome.trim()
    const telLimpo = editClienteTelefone.replace(/\D/g, '')

    if (!nomeLimpo) {
      return setErroEditarCadastro('Informe o nome do cliente.')
    }
    const partesNome = nomeLimpo.split(/\s+/).filter(Boolean)
    if (partesNome.length < 2) {
      return setErroEditarCadastro('Informe ao menos nome e sobrenome do cliente.')
    }
    if (telLimpo && telLimpo.length < 10) {
      return setErroEditarCadastro('Telefone inválido (deve conter DDD + número).')
    }
    if (editClienteOrigem === 'indicacao' && !editClienteCategoriaIndicacao) {
      return setErroEditarCadastro('Informe a categoria da indicação.')
    }
    if (!clienteSelecionado?.id) return

    setSalvandoCadastroCliente(true)
    try {
      const clienteData: Record<string, any> = {
        nome: nomeLimpo,
        telefone_principal: telLimpo || '',
        cpf_cnpj: editClienteCpf.trim() || '',
        email: editClienteEmail.trim() || '',
        natureza_cadastral: editClienteNatureza,
        classificacao_comercial: editClienteClassificacao,
        origem_cliente: editClienteOrigem || '',
        categoria_indicacao: editClienteOrigem === 'indicacao' ? editClienteCategoriaIndicacao : '',
        referencia_origem: editClienteReferencia.trim() || '',
        observacoes: editClienteObservacoes.trim() || '',
      }

      const atualizado = await pb.collection('clientes').update(clienteSelecionado.id, clienteData)

      // Atualiza ou vincula pessoa auxiliar se houver telefone
      if (telLimpo) {
        try {
          const buscaPessoa = await pb
            .collection('pessoas')
            .getList(1, 1, { filter: `telefone_principal = "${telLimpo}"` })
          let pessoa = buscaPessoa.items[0] || null
          if (!pessoa) {
            pessoa = await pb.collection('pessoas').create({
              nome: nomeLimpo,
              telefone_principal: telLimpo,
              ...(editClienteEmail.trim() ? { email: editClienteEmail.trim() } : {}),
              ...(editClienteCpf.trim() && editClienteNatureza === 'pessoa_fisica'
                ? { cpf: editClienteCpf.trim() }
                : {}),
            })
          } else {
            await pb.collection('pessoas').update(pessoa.id, {
              nome: nomeLimpo,
              ...(editClienteEmail.trim() ? { email: editClienteEmail.trim() } : {}),
              ...(editClienteCpf.trim() && editClienteNatureza === 'pessoa_fisica'
                ? { cpf: editClienteCpf.trim() }
                : {}),
            })
          }
          if (pessoa) {
            const vinculo = await pb
              .collection('clientes_pessoas')
              .getList(1, 1, {
                filter: `cliente_id = "${atualizado.id}" && pessoa_id = "${pessoa.id}"`,
              })
            if (vinculo.items.length === 0) {
              await pb
                .collection('clientes_pessoas')
                .create({ cliente_id: atualizado.id, pessoa_id: pessoa.id, papel: 'titular' })
            }
          }
        } catch (subErr) {
          console.warn('Aviso: sincronização de pessoa auxiliar não concluída', subErr)
        }
      }

      setClienteSelecionado(atualizado)
      setClienteBusca(atualizado.nome)
      setShowEditarCadastroModal(false)
      setError('')
    } catch (err: any) {
      setErroEditarCadastro(err.message || 'Não foi possível atualizar o cadastro do cliente.')
    } finally {
      setSalvandoCadastroCliente(false)
    }
  }

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
    const nomeAtual = clienteSelecionado?.nome || ''
    if (!isNomeCompleto(nomeAtual)) {
      return setError(
        'Para formalizar o orçamento, o cliente deve possuir ao menos nome e sobrenome. Utilize a opção "Complementar cadastro" acima.',
      )
    }
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
      setSaved((current) => {
        const foiCriadaNovaVersao = Boolean(resposta.proposta_anterior_id && resposta.proposta_id)
        return {
          ...current,
          id: resposta.proposta_id || current.id,
          versao: resposta.versao || current.versao,
          status: resposta.status,
          pedido_id: foiCriadaNovaVersao ? undefined : resposta.pedido_id || current.pedido_id,
        }
      })
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
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Seletor com busca autocomplete igual a NovaOportunidade */}
              <div className="space-y-1.5 relative" ref={searchContainerRef}>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="cliente_busca"
                    className="text-[15px] font-semibold text-[#5C4A32]"
                  >
                    Cliente *
                  </Label>
                  <button
                    type="button"
                    onClick={abrirModalNovoCliente}
                    className="text-xs font-semibold text-[#B08A3E] hover:text-[#8D6B29] flex items-center gap-1 transition-colors"
                  >
                    <Plus size={13} />
                    Criar novo cliente
                  </button>
                </div>

                <div className="relative">
                  <Input
                    id="cliente_busca"
                    value={clienteBusca}
                    onChange={(e) => handleClienteBuscaChange(e.target.value)}
                    onFocus={() => {
                      if (clienteBusca.trim() && !clienteSelecionado) setDropdownAberto(true)
                    }}
                    placeholder="Digite nome, telefone ou CPF..."
                    autoComplete="off"
                    className="h-10 text-[15px] px-3.5 pr-9 bg-[#FDFAF5] border-[#E8DEC8] text-[#5C4A32] placeholder:text-muted-foreground placeholder:text-sm rounded-xl focus:border-[#B08A3E]"
                  />
                  {clienteSelecionado ? (
                    <button
                      type="button"
                      onClick={limparClienteSelecionado}
                      aria-label="Limpar cliente selecionado"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#5C4A32] p-1"
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <Search size={15} />
                    </div>
                  )}
                </div>

                {buscandoClientes && (
                  <p className="text-xs text-[#8A7A66] pt-0.5">Buscando clientes...</p>
                )}

                {/* Dropdown com resultados filtrados e atalho de novo cadastro */}
                {dropdownAberto && !clienteSelecionado && clienteBusca.trim() && (
                  <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-[#E8DEC8] bg-[#FDFAF5] shadow-lg max-h-60 overflow-y-auto divide-y divide-[#E8DEC8]/60">
                    {clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => selecionarCliente(cliente)}
                          className="w-full text-left px-3.5 py-2.5 text-[15px] hover:bg-[#F5EEE7] transition-colors flex flex-col"
                        >
                          <span className="font-semibold text-[#5C4A32]">{cliente.nome}</span>
                          <span className="text-xs text-[#8A7A66]">
                            {cliente.telefone_principal
                              ? `Tel: ${cliente.telefone_principal}`
                              : 'Sem telefone'}
                            {cliente.cpf_cnpj ? ` · CPF/CNPJ: ${cliente.cpf_cnpj}` : ''}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-sm text-[#8A7A66]">
                        Nenhum cliente encontrado para "{clienteBusca.trim()}"
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={abrirModalNovoCliente}
                      className="w-full text-left px-3.5 py-2.5 text-sm font-semibold text-[#5C4A32] bg-[#F5EEE7] hover:bg-[#EBE2D5] transition-colors flex items-center gap-2"
                    >
                      <UserPlus size={15} className="text-[#B08A3E]" />
                      <span>
                        + Criar novo cliente{' '}
                        {clienteBusca.trim() && (
                          <span className="font-normal text-xs text-[#8A7A66]">
                            (usar "{clienteBusca.trim()}")
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Seletor de Oportunidade */}
              <div className="space-y-1.5">
                <Label htmlFor="oportunidade" className="text-[15px] font-semibold text-[#5C4A32]">
                  Oportunidade *
                </Label>
                <select
                  id="oportunidade"
                  value={oportunidadeId}
                  onChange={(e) => setOportunidadeId(e.target.value)}
                  disabled={!clienteId}
                  className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-[#FDFAF5] px-3.5 py-2 text-[15px] text-[#5C4A32] disabled:opacity-50 disabled:bg-[#F5EFE6]"
                >
                  <option value="">
                    {!clienteId
                      ? 'Selecione um cliente primeiro'
                      : oportunidadesVisiveis.length === 0
                        ? 'Nenhuma oportunidade para este cliente'
                        : 'Selecione a oportunidade'}
                  </option>
                  {oportunidadesVisiveis.map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.tipo_evento || o.tipo_pedido || 'Oportunidade'} · {o.status}
                      {o.nome_noivos ? ` · ${o.nome_noivos}` : ''}
                      {o.nome_aniversariante ? ` · ${o.nome_aniversariante}` : ''}
                    </option>
                  ))}
                </select>
                {clienteId && oportunidadesVisiveis.length === 0 && (
                  <p className="text-xs text-[#8A7A66]">
                    Nenhuma oportunidade vinculada a este cliente. É recomendado criar uma
                    oportunidade antes ou usar o botão "Criar novo cliente" para gerá-la
                    automaticamente.
                  </p>
                )}
              </div>
            </div>

            {/* Painel do cliente selecionado: detalhe e botão único para complementar cadastro completo */}
            {clienteSelecionado && (
              <div className="rounded-xl border border-[#E8DEC8] bg-[#FBF7F0] p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#8A7A66]">
                      Cliente Selecionado
                    </span>
                    {isNomeCompleto(clienteSelecionado.nome) ? (
                      <Badge
                        variant="outline"
                        className="border-[#658B58] text-[#3F6334] bg-[#EEF5EB] text-[11px] px-2 py-0.5 flex items-center gap-1 font-medium"
                      >
                        <Check size={11} /> Nome completo validado
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-[#D6BC7E] text-[#7A5B18] bg-[#FBF5E5] text-[11px] px-2 py-0.5 flex items-center gap-1 font-medium"
                      >
                        <AlertCircle size={11} /> Sobrenome pendente
                      </Badge>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={abrirModalEditarCadastro}
                    className="text-xs text-[#5C4A32] hover:text-[#3D2314] hover:bg-[#F0E6D6] h-8 px-2.5 rounded-lg flex items-center gap-1.5 font-medium"
                  >
                    <Edit2 size={13} />
                    Complementar cadastro
                  </Button>
                </div>

                <div className="space-y-1">
                  <p className="text-base font-semibold text-[#5C4A32]">
                    {clienteSelecionado.nome}
                  </p>
                  <p className="text-xs text-[#8A7A66] flex flex-wrap gap-x-2 gap-y-0.5">
                    {clienteSelecionado.telefone_principal && (
                      <span>Telefone: {clienteSelecionado.telefone_principal}</span>
                    )}
                    {clienteSelecionado.cpf_cnpj && (
                      <span>· CPF/CNPJ: {clienteSelecionado.cpf_cnpj}</span>
                    )}
                    {clienteSelecionado.email && <span>· E-mail: {clienteSelecionado.email}</span>}
                    {clienteSelecionado.natureza_cadastral && (
                      <span>
                        · Natureza:{' '}
                        {clienteSelecionado.natureza_cadastral === 'pessoa_juridica'
                          ? 'Pessoa Jurídica'
                          : 'Pessoa Física'}
                      </span>
                    )}
                    {clienteSelecionado.classificacao_comercial && (
                      <span>
                        · Classificação:{' '}
                        {clienteSelecionado.classificacao_comercial === 'cerimonialista'
                          ? 'Cerimonialista'
                          : clienteSelecionado.classificacao_comercial === 'revendedor'
                            ? 'Revendedor'
                            : clienteSelecionado.classificacao_comercial === 'parceiro_comercial'
                              ? 'Parceiro Comercial'
                              : 'Cliente padrão'}
                      </span>
                    )}
                  </p>
                  {!isNomeCompleto(clienteSelecionado.nome) && (
                    <p className="text-xs text-[#8D6B29] pt-1">
                      ℹ O orçamento formal requer nome e sobrenome completo. Clique em{' '}
                      <strong>Complementar cadastro</strong> para atualizar os dados deste cliente
                      antes de emitir a proposta.
                    </p>
                  )}
                </div>
              </div>
            )}
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
                      ordem {item.ordem} · {item.tipo} · quantidade{' '}
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

      {/* Modal para complementar / editar o cadastro completo do cliente selecionado */}
      <Dialog open={showEditarCadastroModal} onOpenChange={setShowEditarCadastroModal}>
        <DialogContent className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl max-w-lg p-6 text-[#5C4A32] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-semibold text-[#5C4A32] flex items-center gap-2">
              <Edit2 className="text-[#B08A3E]" size={20} />
              Complementar Cadastro do Cliente
            </DialogTitle>
            <DialogDescription className="text-sm text-[#8A7A66]">
              Atualize ou complete as informações cadastrais do cliente selecionado. As alterações
              serão salvas imediatamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={salvarEditarCadastro} className="space-y-4 pt-2">
            {erroEditarCadastro && (
              <div
                role="alert"
                className="p-3 text-sm text-[#7A2E2E] bg-[#FAF1F1] border border-[#7A2E2E]/30 rounded-xl"
              >
                {erroEditarCadastro}
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="edit_cliente_nome"
                className="text-[15px] font-semibold text-[#5C4A32]"
              >
                Nome completo (nome + sobrenome) *
              </Label>
              <Input
                id="edit_cliente_nome"
                value={editClienteNome}
                onChange={(e) => setEditClienteNome(e.target.value)}
                placeholder="Ex.: Carolina Prado Ferreira"
                required
                className="h-10 text-[15px] px-3.5 bg-white border-[#E8DEC8] text-[#5C4A32] rounded-xl focus:border-[#B08A3E]"
              />
              <p className="text-xs text-[#8A7A66]">
                Para orçamentos formais, é necessário ao menos o primeiro nome e sobrenome.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit_cliente_tel"
                  className="text-[15px] font-semibold text-[#5C4A32]"
                >
                  Telefone principal
                </Label>
                <Input
                  id="edit_cliente_tel"
                  type="tel"
                  value={editClienteTelefone}
                  onChange={(e) => setEditClienteTelefone(e.target.value)}
                  placeholder="Ex.: (11) 98765-4321"
                  className="h-10 text-[15px] px-3.5 bg-white border-[#E8DEC8] text-[#5C4A32] rounded-xl focus:border-[#B08A3E]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit_cliente_cpf"
                  className="text-[15px] font-semibold text-[#5C4A32]"
                >
                  CPF ou CNPJ
                </Label>
                <Input
                  id="edit_cliente_cpf"
                  value={editClienteCpf}
                  onChange={(e) => setEditClienteCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-10 text-[15px] px-3.5 bg-white border-[#E8DEC8] text-[#5C4A32] rounded-xl focus:border-[#B08A3E]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit_cliente_email"
                className="text-[15px] font-semibold text-[#5C4A32]"
              >
                E-mail (opcional)
              </Label>
              <Input
                id="edit_cliente_email"
                type="email"
                value={editClienteEmail}
                onChange={(e) => setEditClienteEmail(e.target.value)}
                placeholder="cliente@exemplo.com.br"
                className="h-10 text-[15px] px-3.5 bg-white border-[#E8DEC8] text-[#5C4A32] rounded-xl focus:border-[#B08A3E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit_cliente_natureza"
                  className="text-[15px] font-semibold text-[#5C4A32]"
                >
                  Natureza cadastral *
                </Label>
                <select
                  id="edit_cliente_natureza"
                  value={editClienteNatureza}
                  onChange={(e) => setEditClienteNatureza(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-white px-3.5 py-2 text-[15px] text-[#5C4A32]"
                >
                  <option value="pessoa_fisica">Pessoa Física</option>
                  <option value="pessoa_juridica">Pessoa Jurídica</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit_cliente_classificacao"
                  className="text-[15px] font-semibold text-[#5C4A32]"
                >
                  Classificação comercial *
                </Label>
                <select
                  id="edit_cliente_classificacao"
                  value={editClienteClassificacao}
                  onChange={(e) => setEditClienteClassificacao(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-white px-3.5 py-2 text-[15px] text-[#5C4A32]"
                >
                  <option value="cliente_padrao">Cliente padrão</option>
                  <option value="cerimonialista">Cerimonialista</option>
                  <option value="revendedor">Revendedor</option>
                  <option value="parceiro_comercial">Parceiro Comercial</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit_cliente_origem"
                className="text-[15px] font-semibold text-[#5C4A32]"
              >
                Origem do cliente
              </Label>
              <select
                id="edit_cliente_origem"
                value={editClienteOrigem}
                onChange={(e) => setEditClienteOrigem(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-white px-3.5 py-2 text-[15px] text-[#5C4A32]"
              >
                <option value="">Selecione a origem, se souber</option>
                <option value="instagram">Instagram</option>
                <option value="google">Google</option>
                <option value="tiktok">TikTok</option>
                <option value="indicacao">Indicação</option>
                <option value="cerimonialista">Cerimonialista</option>
                <option value="parceiro_comercial">Parceiro Comercial</option>
                <option value="ifood">iFood</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {editClienteOrigem === 'indicacao' && (
              <div className="rounded-xl border border-[#E8DEC8] bg-[#FBF7F0] p-3 space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit_cliente_cat_indicacao"
                    className="text-[15px] font-semibold text-[#5C4A32]"
                  >
                    Categoria da indicação *
                  </Label>
                  <select
                    id="edit_cliente_cat_indicacao"
                    value={editClienteCategoriaIndicacao}
                    onChange={(e) => setEditClienteCategoriaIndicacao(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-white px-3.5 py-2 text-[15px] text-[#5C4A32]"
                  >
                    <option value="">Selecione a categoria</option>
                    <option value="profissional_mercado">Profissional do mercado</option>
                    <option value="outra_noiva_cliente">Outra noiva/cliente</option>
                    <option value="parente">Parente</option>
                    <option value="amigo_conhecido">Amigo/conhecido</option>
                    <option value="outro">Outro</option>
                    <option value="nao_informado">Não informado</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit_cliente_ref"
                    className="text-[15px] font-semibold text-[#5C4A32]"
                  >
                    Referência da indicação
                  </Label>
                  <Input
                    id="edit_cliente_ref"
                    value={editClienteReferencia}
                    onChange={(e) => setEditClienteReferencia(e.target.value)}
                    placeholder="Ex.: indicação da noiva Mariana"
                    className="h-10 text-[15px] px-3.5 bg-white border-[#E8DEC8] text-[#5C4A32] rounded-xl focus:border-[#B08A3E]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="edit_cliente_obs"
                className="text-[15px] font-semibold text-[#5C4A32]"
              >
                Observações do cliente
              </Label>
              <Input
                id="edit_cliente_obs"
                value={editClienteObservacoes}
                onChange={(e) => setEditClienteObservacoes(e.target.value)}
                placeholder="Preferências, anotações de atendimento..."
                className="h-10 text-[15px] px-3.5 bg-white border-[#E8DEC8] text-[#5C4A32] rounded-xl focus:border-[#B08A3E]"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-[#E8DEC8]/60 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditarCadastroModal(false)}
                className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] text-sm rounded-xl px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoCadastroCliente}
                className="bg-[#5C4A32] hover:bg-[#473926] text-white text-sm rounded-xl px-5 py-2 flex items-center gap-1.5"
              >
                <Check size={16} />
                {salvandoCadastroCliente ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para cadastrar novo cliente diretamente da busca */}
      <Dialog open={showNovoClienteModal} onOpenChange={setShowNovoClienteModal}>
        <DialogContent className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl max-w-lg p-6 text-[#5C4A32]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-semibold text-[#5C4A32] flex items-center gap-2">
              <UserPlus className="text-[#B08A3E]" size={20} />
              Cadastrar Novo Cliente
            </DialogTitle>
            <DialogDescription className="text-sm text-[#8A7A66]">
              Preencha os dados do cliente. Ele será selecionado automaticamente para este
              orçamento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={salvarNovoCliente} className="space-y-4 pt-2">
            {modalClienteErro && (
              <div
                role="alert"
                className="p-3 text-sm text-[#7A2E2E] bg-[#FAF1F1] border border-[#7A2E2E]/30 rounded-xl"
              >
                {modalClienteErro}
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="modal_cliente_nome"
                className="text-[15px] font-semibold text-[#5C4A32]"
              >
                Nome completo (nome + sobrenome) *
              </Label>
              <Input
                id="modal_cliente_nome"
                value={novoClienteNome}
                onChange={(e) => setNovoClienteNome(e.target.value)}
                placeholder="Ex.: Carolina Prado Ferreira"
                required
                className="h-10 text-[15px] px-3.5 bg-white border-[#E8DEC8] text-[#5C4A32] rounded-xl focus:border-[#B08A3E]"
              />
              <p className="text-xs text-[#8A7A66]">
                Para orçamentos formais, é necessário ao menos o primeiro nome e sobrenome.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="modal_cliente_tel"
                  className="text-[15px] font-semibold text-[#5C4A32]"
                >
                  Telefone principal
                </Label>
                <Input
                  id="modal_cliente_tel"
                  type="tel"
                  value={novoClienteTelefone}
                  onChange={(e) => setNovoClienteTelefone(e.target.value)}
                  placeholder="Ex.: (11) 98765-4321"
                  className="h-10 text-[15px] px-3.5 bg-white border-[#E8DEC8] text-[#5C4A32] rounded-xl focus:border-[#B08A3E]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="modal_cliente_cpf"
                  className="text-[15px] font-semibold text-[#5C4A32]"
                >
                  CPF ou CNPJ
                </Label>
                <Input
                  id="modal_cliente_cpf"
                  value={novoClienteCpf}
                  onChange={(e) => setNovoClienteCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-10 text-[15px] px-3.5 bg-white border-[#E8DEC8] text-[#5C4A32] rounded-xl focus:border-[#B08A3E]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="modal_cliente_email"
                className="text-[15px] font-semibold text-[#5C4A32]"
              >
                E-mail (opcional)
              </Label>
              <Input
                id="modal_cliente_email"
                type="email"
                value={novoClienteEmail}
                onChange={(e) => setNovoClienteEmail(e.target.value)}
                placeholder="cliente@exemplo.com.br"
                className="h-10 text-[15px] px-3.5 bg-white border-[#E8DEC8] text-[#5C4A32] rounded-xl focus:border-[#B08A3E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="modal_cliente_natureza"
                  className="text-[15px] font-semibold text-[#5C4A32]"
                >
                  Natureza
                </Label>
                <select
                  id="modal_cliente_natureza"
                  value={novoClienteNatureza}
                  onChange={(e) => setNovoClienteNatureza(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-white px-3.5 py-2 text-[15px] text-[#5C4A32]"
                >
                  <option value="pessoa_fisica">Pessoa Física</option>
                  <option value="pessoa_juridica">Pessoa Jurídica</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="modal_cliente_classificacao"
                  className="text-[15px] font-semibold text-[#5C4A32]"
                >
                  Classificação
                </Label>
                <select
                  id="modal_cliente_classificacao"
                  value={novoClienteClassificacao}
                  onChange={(e) => setNovoClienteClassificacao(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-white px-3.5 py-2 text-[15px] text-[#5C4A32]"
                >
                  <option value="cliente_padrao">Cliente padrão</option>
                  <option value="cerimonialista">Cerimonialista</option>
                  <option value="revendedor">Revendedor</option>
                  <option value="parceiro_comercial">Parceiro Comercial</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#5C4A32]">
                <input
                  type="checkbox"
                  checked={novoClienteCriarOportunidade}
                  onChange={(e) => setNovoClienteCriarOportunidade(e.target.checked)}
                  className="h-4 w-4 rounded border-[#E8DEC8] text-[#5C4A32] focus:ring-[#B08A3E]"
                />
                <span>Criar e vincular uma oportunidade inicial automaticamente</span>
              </label>
            </div>

            <DialogFooter className="pt-4 border-t border-[#E8DEC8]/60 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNovoClienteModal(false)}
                className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] text-sm rounded-xl px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoNovoCliente}
                className="bg-[#5C4A32] hover:bg-[#473926] text-white text-sm rounded-xl px-5 py-2 flex items-center gap-1.5"
              >
                <Check size={16} />
                {salvandoNovoCliente ? 'Cadastrando...' : 'Cadastrar e Vincular'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
