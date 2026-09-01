import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import pb from '@/lib/pocketbase/client'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'

const NovaOportunidade = () => {
  const [formData, setFormData] = useState({
    cliente_id: '',
    segmento: '',
    tipo_pedido: '',
    status: 'novo',
    nome_noivos: '',
    nome_aniversariante: '',
    nome_casal: '',
    nome_bebe: '',
    tipo_outro: '',
    descricao_outro_evento: '',
    responsavel_atual: '',
    proxima_acao: '',
    prazo_proxima_acao: '',
    valor_estimado: '',
    data_evento: '',
    local_evento: '',
    qtd_convidados: '',
    qtd_bem_casados: '',
    observacoes: '',
    source_ref: '',
    tipo_evento: '',
    segmento_classificado: '',
    subtipo_evento: '',
    justificativa_outros: '',
    modalidade_entrega: '',
    referencia_paleta: '',
    datas_entrega: '',
    tipo_cliente: '',
    data_estimada_parto: '',
    maternidade: '',
    tipo_parto: '',
    responsavel_acompanhamento: '',
  })
  const [loading, setLoading] = useState(false)
  const [duplicata, setDuplicata] = useState(null)
  const [verificandoDuplicata, setVerificandoDuplicata] = useState(false)
  const [segmentoDerivado, setSegmentoDerivado] = useState('')
  const [rollbackRef, setRollbackRef] = useState('')
  const [catalogItems, setCatalogItems] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogItemId, setCatalogItemId] = useState('')
  const [pendingField, setPendingField] = useState('')
  const [pendingReason, setPendingReason] = useState('')
  const [pendingOwner, setPendingOwner] = useState('')
  const [pendingDue, setPendingDue] = useState('')
  const [pendingAction, setPendingAction] = useState('')
  const [conflictField, setConflictField] = useState('')
  const [conflictOld, setConflictOld] = useState('')
  const [conflictNew, setConflictNew] = useState('')
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    email: '',
    natureza: 'pessoa_fisica',
    classificacao: 'cliente_padrao',
  })
  const [criandoCliente, setCriandoCliente] = useState(false)
  const [clienteBusca, setClienteBusca] = useState('')
  const [clientesFiltrados, setClientesFiltrados] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [buscandoClientes, setBuscandoClientes] = useState(false)
  const buscaTimer = useRef(null)
  const buscaClienteRef = useRef(0)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => () => window.clearTimeout(buscaTimer.current), [])

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const result = await pb.collection('catalogo_itens').getList(1, 200, {
          filter: 'review_status = "aprovado"',
          sort: 'categoria,display_label',
        })
        setCatalogItems(result.items)
      } catch (error) {
        toast({ title: 'Não foi possível carregar o catálogo aprovado', variant: 'destructive' })
      } finally {
        setCatalogLoading(false)
      }
    }
    loadCatalog()
  }, [])
  const buscarClientes = async (termo) => {
    const id = ++buscaClienteRef.current
    if (!termo.trim()) {
      setClientesFiltrados([])
      return
    }
    setBuscandoClientes(true)
    try {
      const safeName = termo.trim().replace(/"/g, '\\"')
      const safeDigits = termo.replace(/\D/g, '')
      const parts = [`nome ~ "${safeName}"`]
      if (safeDigits.length >= 3) parts.push(`telefone_principal ~ "${safeDigits}"`)
      const r = await pb
        .collection('clientes')
        .getList(1, 8, { filter: `(${parts.join(' || ')})`, sort: 'nome' })
      if (id === buscaClienteRef.current) setClientesFiltrados(r.items)
    } catch (error) {
      console.warn('Falha ao buscar clientes', error)
    } finally {
      if (id === buscaClienteRef.current) setBuscandoClientes(false)
    }
  }
  const handleClienteBusca = (value) => {
    setClienteBusca(value)
    setClienteSelecionado(null)
    setFormData((prev) => ({ ...prev, cliente_id: '' }))
    if (buscaTimer.current) window.clearTimeout(buscaTimer.current)
    buscaTimer.current = window.setTimeout(() => buscarClientes(value), 300)
  }
  const selecionarCliente = (cliente) => {
    setClienteSelecionado(cliente)
    setClienteBusca(cliente.nome)
    setClientesFiltrados([])
    setFormData((prev) => ({ ...prev, cliente_id: cliente.id }))
  }
  const abrirNovoClienteDaBusca = () => {
    const digitado = clienteBusca.trim()
    setNovoCliente((prev) => ({
      ...prev,
      nome: /[A-Za-zÀ-ú]/.test(digitado) ? digitado : prev.nome,
      telefone: digitado.replace(/\D/g, '').length >= 10 ? digitado : prev.telefone,
    }))
    setClientesFiltrados([])
    setShowNovoCliente(true)
  }
  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }))

  const selecionarItemCatalogo = (itemId) => {
    const item = catalogItems.find((candidate) => candidate.id === itemId)
    setCatalogItemId(itemId)
    setFormData((prev) => ({
      ...prev,
      catalogo_item_id: item?.id || '',
      catalogo_codigo: item?.codigo || '',
      catalogo_label: item?.display_label || '',
      catalogo_source_version: item?.source_version || '',
      catalogo_selected_at: item ? new Date().toISOString() : '',
      catalogo_selected_by: item ? pb.authStore.record.id : '',
    }))
  }
  const criarClienteInline = async () => {
    const nome = novoCliente.nome.trim()
    const telefone = novoCliente.telefone.replace(/\D/g, '')
    if (!nome || telefone.length < 10) {
      toast({ title: 'Informe nome e telefone do cliente', variant: 'destructive' })
      return
    }
    setCriandoCliente(true)
    try {
      let pessoa = null
      const busca = await pb
        .collection('pessoas')
        .getList(1, 1, { filter: `telefone_principal = "${telefone}"` })
      pessoa = busca.items[0] || null
      const cliente = await pb.collection('clientes').create({
        nome,
        telefone_principal: telefone,
        situacao: 'ativo',
        natureza_cadastral: novoCliente.natureza,
        classificacao_comercial: novoCliente.classificacao,
        ...(novoCliente.email ? { email: novoCliente.email } : {}),
      })
      if (!pessoa) {
        try {
          pessoa = await pb.collection('pessoas').create({
            nome,
            telefone_principal: telefone,
            ...(novoCliente.email ? { email: novoCliente.email } : {}),
          })
        } catch (error) {
          console.warn('Pessoa auxiliar não criada', error)
        }
      }
      if (pessoa) {
        try {
          await pb
            .collection('clientes_pessoas')
            .create({ cliente_id: cliente.id, pessoa_id: pessoa.id, papel: 'titular' })
        } catch (error) {
          console.warn('Vínculo auxiliar não criado', error)
        }
      }
      setClienteSelecionado(cliente)
      setClienteBusca(cliente.nome)
      setClientesFiltrados([])
      setFormData((prev) => ({ ...prev, cliente_id: cliente.id }))
      setShowNovoCliente(false)
      toast({ title: 'Cliente cadastrado e vinculado a esta oportunidade' })
    } catch (error) {
      toast({
        title: 'Não foi possível cadastrar o cliente',
        description: error?.message || 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setCriandoCliente(false)
    }
  }
  const registrarPendencia = async () => {
    if (
      !pendingField.trim() ||
      !pendingReason.trim() ||
      !pendingOwner ||
      !pendingDue ||
      !pendingAction.trim()
    ) {
      toast({
        title: 'Preencha campo, motivo, responsável, próxima ação e prazo',
        variant: 'destructive',
      })
      return
    }
    if (!formData.cliente_id || !formData.tipo_pedido) {
      toast({
        title: 'Selecione cliente e tipo antes de registrar a pendência',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      const oportunidade = await pb.collection('oportunidades').create({
        ...formData,
        responsavel_atual: pb.authStore.record.id,
        status: 'aguardando_dados',
      })
      await pb.collection('pendencias').create({
        oportunidade_id: oportunidade.id,
        campo: pendingField.trim(),
        valor_atual: '',
        origem: 'atendimento',
        motivo: pendingReason.trim(),
        responsavel: pendingOwner,
        proxima_acao: pendingAction.trim(),
        prazo: pendingDue,
        pending_type: 'campo_ausente',
        status: 'aberta',
      })
      await pb.collection('historico_eventos').create({
        oportunidade_id: oportunidade.id,
        descricao: `Pendência registrada para ${pendingField.trim()}: ${pendingReason.trim()}`,
        tipo_evento: 'atualizacao',
        autor: pb.authStore.record.id,
        campo: pendingField.trim(),
        origem: 'atendimento',
        valor_novo: '',
      })
      toast({ title: 'Pedido salvo com pendência' })
      navigate('/')
    } catch (error) {
      toast({
        title: 'Não foi possível registrar a pendência',
        description: error?.message || 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const registrarConflito = async () => {
    if (!conflictField.trim() || !conflictOld.trim() || !conflictNew.trim()) {
      toast({ title: 'Informe campo e os dois valores conflitantes', variant: 'destructive' })
      return
    }
    if (!formData.cliente_id || !formData.tipo_pedido) {
      toast({
        title: 'Selecione cliente e tipo antes de registrar o conflito',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      const oportunidade = await pb.collection('oportunidades').create({
        ...formData,
        responsavel_atual: pb.authStore.record.id,
        status: 'aguardando_dados',
      })
      await pb.collection('pendencias').create({
        oportunidade_id: oportunidade.id,
        campo: conflictField.trim(),
        valor_atual: conflictNew.trim(),
        origem: 'atendimento',
        motivo: 'Dois valores diferentes precisam de confirmação humana',
        responsavel: pb.authStore.record.id,
        proxima_acao: 'Confirmar qual valor é correto com a cliente',
        prazo: pendingDue || new Date().toISOString().slice(0, 10),
        pending_type: 'identity_conflict',
        status: 'aberta',
      })
      await pb.collection('historico_eventos').create({
        oportunidade_id: oportunidade.id,
        descricao: `Conflito em ${conflictField.trim()}; confirmação humana necessária`,
        tipo_evento: 'erro',
        autor: pb.authStore.record.id,
        campo: conflictField.trim(),
        origem: 'atendimento',
        valor_anterior: conflictOld.trim(),
        valor_novo: conflictNew.trim(),
      })
      toast({ title: 'Conflito registrado sem apagar nenhum valor' })
      navigate('/')
    } catch (error) {
      toast({
        title: 'Não foi possível registrar o conflito',
        description: error?.message || 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const registrarDecisao = async (oportunidadeId, descricao, decisao) => {
    try {
      await pb.collection('historico_eventos').create({
        oportunidade_id: oportunidadeId,
        descricao,
        tipo_evento: 'nota',
        autor: pb.authStore.record.id,
        decisao_duplicidade: decisao,
      })
    } catch (error) {
      console.warn('Decisão não registrada no histórico', error)
    }
  }
  const rollbackFixture = async () => {
    if (!rollbackRef.trim()) return
    setLoading(true)
    try {
      const result = await pb
        .collection('oportunidades')
        .getList(1, 1, { filter: `source_ref = "${rollbackRef.trim().replace(/"/g, '\\"')}"` })
      const original = result.items[0]
      if (!original) {
        toast({ title: 'Fixture não encontrada', variant: 'destructive' })
        return
      }
      await registrarDecisao(
        original.id,
        `Rollback de fixture solicitado para source_ref ${rollbackRef.trim()}; registro original preservado.`,
        'nao_aplicavel',
      )
      setRollbackRef('')
      toast({
        title: 'Rollback registrado',
        description: 'O registro original e o histórico foram preservados.',
      })
    } catch (error) {
      toast({
        title: 'Não foi possível registrar o rollback',
        description: error?.message || 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  const deriveSegment = (tipo) =>
    ({
      casamento: 'casamento',
      degustacao: 'eventos_sociais',
      revendedor: 'corporativo',
      bem_nascido: 'maternidade',
      batizado: 'eventos_sociais',
      bodas: 'eventos_sociais',
      formatura: 'eventos_sociais',
      aniversario: 'eventos_sociais',
      cha_bebe: 'maternidade',
      revelacao: 'maternidade',
      maternidade: 'maternidade',
      corporativo: 'corporativo',
      presente: 'presente',
      outros: 'outros',
    })[tipo] || ''
  const handleEventTypeChange = (tipo) => {
    const segmento = deriveSegment(tipo)
    setSegmentoDerivado(segmento)
    setFormData((prev) => ({
      ...prev,
      tipo_evento: tipo,
      tipo_pedido: tipo,
      segmento,
      segmento_classificado: segmento,
      subtipo_evento: '',
      justificativa_outros: '',
    }))
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!formData.tipo_evento || !formData.segmento_classificado) {
        toast({ title: 'Informe o tipo de evento', variant: 'destructive' })
        setLoading(false)
        return
      }
      if (formData.tipo_evento === 'aniversario' && !formData.subtipo_evento) {
        toast({ title: 'Informe o tipo de aniversário', variant: 'destructive' })
        setLoading(false)
        return
      }
      if (formData.tipo_evento === 'outros' && !formData.justificativa_outros.trim()) {
        toast({ title: 'Justifique o tipo de evento', variant: 'destructive' })
        setLoading(false)
        return
      }
      const dataToSend = { ...formData, responsavel_atual: pb.authStore.record.id }
      if (dataToSend.source_ref) {
        setVerificandoDuplicata(true)
        const repetida = await pb
          .collection('oportunidades')
          .getList(1, 1, { filter: `source_ref = "${dataToSend.source_ref.replace(/"/g, '\\"')}"` })
        setVerificandoDuplicata(false)
        if (repetida.items[0]) {
          setDuplicata(repetida.items[0])
          const reutilizar = window.confirm(
            `Já existe uma oportunidade com este identificador (${repetida.items[0].id}).\n\nOK: reutilizar a existente.\nCancelar: criar uma nova sem alterar a original.`,
          )
          setDuplicata(null)
          if (reutilizar) {
            await registrarDecisao(
              repetida.items[0].id,
              `Duplicidade identificada por source_ref ${dataToSend.source_ref}; cadastro reutilizado por decisão humana.`,
              'reutilizar',
            )
            toast({ title: 'Oportunidade existente reutilizada' })
            navigate('/')
            return
          }
          await registrarDecisao(
            repetida.items[0].id,
            `Duplicidade identificada por source_ref ${dataToSend.source_ref}; novo registro autorizado por decisão humana.`,
            'criar_novo',
          )
        }
      }
      if (dataToSend.valor_estimado)
        dataToSend.valor_estimado = parseFloat(dataToSend.valor_estimado)
      if (dataToSend.qtd_convidados) dataToSend.qtd_convidados = parseInt(dataToSend.qtd_convidados)
      if (dataToSend.qtd_bem_casados)
        dataToSend.qtd_bem_casados = parseInt(dataToSend.qtd_bem_casados)
      Object.keys(dataToSend).forEach((key) => {
        if (dataToSend[key] === '') delete dataToSend[key]
      })
      await pb.collection('oportunidades').create(dataToSend)
      toast({
        title: 'Oportunidade criada com sucesso!',
        description: 'O registro foi salvo no sistema',
      })
      navigate('/')
    } catch (error) {
      toast({
        title: 'Erro ao criar oportunidade',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="bg-[#3D2314] text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold">Nova Oportunidade</h1>
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Registro de Oportunidade</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente_busca">Cliente *</Label>
                  <Input
                    id="cliente_busca"
                    value={clienteBusca}
                    onChange={(e) => handleClienteBusca(e.target.value)}
                    placeholder="Digite para buscar"
                    autoComplete="off"
                  />
                  {buscandoClientes && <p className="text-xs text-muted-foreground">Buscando...</p>}
                  {!clienteSelecionado && clienteBusca.trim() && (
                    <div className="rounded-md border bg-white shadow-sm max-h-56 overflow-auto">
                      {clientesFiltrados.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => selecionarCliente(cliente)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5EEE7]"
                        >
                          <span className="font-medium">{cliente.nome}</span>
                          <span className="block text-xs text-muted-foreground">
                            {cliente.telefone_principal}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={abrirNovoClienteDaBusca}
                        className="w-full text-left px-3 py-2 text-sm font-medium text-[#3D2314] bg-[#F5EEE7] border-t"
                      >
                        + Adicionar novo
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Evento *</Label>
                  <Select onValueChange={handleEventTypeChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        ['casamento', 'Casamento'],
                        ['degustacao', 'Degustação'],
                        ['revendedor', 'Revendedor'],
                        ['bem_nascido', 'Bem-nascido'],
                        ['batizado', 'Batizado'],
                        ['aniversario', 'Aniversário'],
                        ['corporativo', 'Corporativo'],
                        ['bodas', 'Bodas'],
                        ['formatura', 'Formatura'],
                        ['cha_bebe', 'Chá de bebê'],
                        ['revelacao', 'Revelação'],
                        ['presente', 'Presente'],
                        ['outros', 'Outros'],
                      ].map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {showNovoCliente && (
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium">Cadastrar novo cliente</p>
                  <Input
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente((p) => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome do cliente"
                  />
                  <Input
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente((p) => ({ ...p, telefone: e.target.value }))}
                    placeholder="Telefone"
                  />
                  <Button type="button" onClick={criarClienteInline} disabled={criandoCliente}>
                    Salvar cliente e vincular
                  </Button>
                </div>
              )}

              {formData.tipo_evento === 'casamento' && (
                <div>
                  <Label>Nome dos noivos</Label>
                  <Input
                    value={formData.nome_noivos}
                    onChange={(e) => handleChange('nome_noivos', e.target.value)}
                  />
                </div>
              )}
              {formData.tipo_evento === 'aniversario' && (
                <div>
                  <Label>Tipo de aniversário *</Label>
                  <Input
                    value={formData.subtipo_evento}
                    onChange={(e) => handleChange('subtipo_evento', e.target.value)}
                  />
                </div>
              )}
              {formData.tipo_evento === 'outros' && (
                <div>
                  <Label>Justificativa *</Label>
                  <Input
                    value={formData.justificativa_outros}
                    onChange={(e) => handleChange('justificativa_outros', e.target.value)}
                  />
                </div>
              )}
              {formData.tipo_evento === 'degustacao' && (
                <div className="border p-4">
                  <Label>Modalidade de entrega</Label>
                  <Input
                    value={formData.modalidade_entrega}
                    onChange={(e) => handleChange('modalidade_entrega', e.target.value)}
                  />
                  <Label>Referência / paleta</Label>
                  <Input
                    value={formData.referencia_paleta}
                    onChange={(e) => handleChange('referencia_paleta', e.target.value)}
                  />
                </div>
              )}
              {formData.tipo_evento === 'revendedor' && (
                <div className="border p-4">
                  <Label>Datas de entrega</Label>
                  <Input
                    value={formData.datas_entrega}
                    onChange={(e) => handleChange('datas_entrega', e.target.value)}
                  />
                  <Label>Tipo de cliente</Label>
                  <Input
                    value={formData.tipo_cliente}
                    onChange={(e) => handleChange('tipo_cliente', e.target.value)}
                  />
                </div>
              )}
              {formData.tipo_evento === 'bem_nascido' && (
                <div className="border p-4">
                  <Label>Data estimada do parto</Label>
                  <Input
                    type="date"
                    value={formData.data_estimada_parto}
                    onChange={(e) => handleChange('data_estimada_parto', e.target.value)}
                  />
                  <Label>Maternidade</Label>
                  <Input
                    value={formData.maternidade}
                    onChange={(e) => handleChange('maternidade', e.target.value)}
                  />
                  <Label>Tipo de parto</Label>
                  <Input
                    value={formData.tipo_parto}
                    onChange={(e) => handleChange('tipo_parto', e.target.value)}
                  />
                  <Label>Responsável pelo acompanhamento</Label>
                  <Input
                    value={formData.responsavel_acompanhamento}
                    onChange={(e) => handleChange('responsavel_acompanhamento', e.target.value)}
                  />
                </div>
              )}
              <div className="border-dashed border p-3">
                <Label>Identificador de origem</Label>
                <Input
                  value={formData.source_ref}
                  onChange={(e) => handleChange('source_ref', e.target.value)}
                />
                <Button type="button" variant="outline" onClick={rollbackFixture}>
                  Registrar rollback
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Próxima Ação</Label>
                  <Input
                    value={formData.proxima_acao}
                    onChange={(e) => handleChange('proxima_acao', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Prazo Próxima Ação</Label>
                  <Input
                    type="date"
                    value={formData.prazo_proxima_acao}
                    onChange={(e) => handleChange('prazo_proxima_acao', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Input
                  value={formData.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                />
              </div>
              <div className="rounded-md border border-[#C69D5F] bg-[#F5EEE7] p-4 space-y-3">
                <div>
                  <Label htmlFor="catalogo_item">Opção aprovada do catálogo</Label>
                  <p className="text-xs text-muted-foreground">
                    Somente itens aprovados podem ser usados em novos pedidos.
                  </p>
                </div>
                <select
                  id="catalogo_item"
                  value={catalogItemId}
                  onChange={(e) => selecionarItemCatalogo(e.target.value)}
                  disabled={catalogLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma opção (opcional)</option>
                  {catalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.codigo} · {item.display_label} · v{item.source_version}
                    </option>
                  ))}
                </select>
                {catalogItemId && (
                  <p className="text-xs text-muted-foreground">
                    A seleção será salva com código, nome e versão no pedido.
                  </p>
                )}
              </div>
              <div className="rounded-md border border-[#C69D5F] bg-[#F5EEE7] p-4 space-y-3">
                <p className="font-medium">Registrar informação faltante</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Campo faltante"
                    value={pendingField}
                    onChange={(e) => setPendingField(e.target.value)}
                  />
                  <Input
                    placeholder="Motivo"
                    value={pendingReason}
                    onChange={(e) => setPendingReason(e.target.value)}
                  />
                  <Input
                    placeholder="ID do responsável"
                    value={pendingOwner}
                    onChange={(e) => setPendingOwner(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={pendingDue}
                    onChange={(e) => setPendingDue(e.target.value)}
                  />
                  <Input
                    placeholder="Próxima ação"
                    value={pendingAction}
                    onChange={(e) => setPendingAction(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={registrarPendencia}
                  disabled={loading}
                >
                  Salvar como pendência
                </Button>
              </div>

              <div className="rounded-md border border-[#7A2E2E] bg-[#FAF1F1] p-4 space-y-3">
                <p className="font-medium text-[#7A2E2E]">Registrar valor contraditório</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Campo"
                    value={conflictField}
                    onChange={(e) => setConflictField(e.target.value)}
                  />
                  <Input
                    placeholder="Valor informado antes"
                    value={conflictOld}
                    onChange={(e) => setConflictOld(e.target.value)}
                  />
                  <Input
                    placeholder="Novo valor informado"
                    value={conflictNew}
                    onChange={(e) => setConflictNew(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Os dois valores ficam preservados e o pedido permanece aguardando confirmação
                  humana.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={registrarConflito}
                  disabled={loading}
                >
                  Salvar conflito
                </Button>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading || verificandoDuplicata ? 'Verificando...' : 'Salvar Oportunidade'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/')}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </div>
  )
}

export default NovaOportunidade
