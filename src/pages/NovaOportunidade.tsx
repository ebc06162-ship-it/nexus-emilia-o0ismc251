import { useState, useEffect } from 'react'
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
  const [clientes, setClientes] = useState([])
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
  })
  const [loading, setLoading] = useState(false)
  const [duplicata, setDuplicata] = useState(null)
  const [verificandoDuplicata, setVerificandoDuplicata] = useState(false)
  const [segmentoDerivado, setSegmentoDerivado] = useState('')
  const [rollbackRef, setRollbackRef] = useState('')
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    email: '',
    natureza: 'pessoa_fisica',
    classificacao: 'cliente_padrao',
  })
  const [criandoCliente, setCriandoCliente] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    loadClientes()
  }, [])

  const loadClientes = async () => {
    try {
      const result = await pb.collection('clientes').getList(1, 100)
      setClientes(result.items)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
      const busca = await pb.collection('pessoas').getList(1, 1, {
        filter: `telefone_principal = "${telefone}"`,
      })
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
      await loadClientes()
      setFormData((prev) => ({ ...prev, cliente_id: cliente.id }))
      setNovoCliente({
        nome: '',
        telefone: '',
        email: '',
        natureza: 'pessoa_fisica',
        classificacao: 'cliente_padrao',
      })
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
      const result = await pb.collection('oportunidades').getList(1, 1, {
        filter: `source_ref = "${rollbackRef.trim().replace(/"/g, '\\"')}"`,
      })
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
      segmento: '',
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
      const dataToSend = {
        ...formData,
        responsavel_atual: pb.authStore.record.id,
      }

      if (dataToSend.source_ref) {
        setVerificandoDuplicata(true)
        const repetida = await pb.collection('oportunidades').getList(1, 1, {
          filter: `source_ref = "${dataToSend.source_ref.replace(/"/g, '\\"')}"`,
        })
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

      // Converter valores numéricos
      if (dataToSend.valor_estimado)
        dataToSend.valor_estimado = parseFloat(dataToSend.valor_estimado)
      if (dataToSend.qtd_convidados) dataToSend.qtd_convidados = parseInt(dataToSend.qtd_convidados)
      if (dataToSend.qtd_bem_casados)
        dataToSend.qtd_bem_casados = parseInt(dataToSend.qtd_bem_casados)

      // Remover campos vazios
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
                  <Label htmlFor="cliente_id">Cliente *</Label>
                  <Select onValueChange={(v) => handleChange('cliente_id', v)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_evento">Tipo de Evento *</Label>
                  <Select onValueChange={handleEventTypeChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casamento">Casamento</SelectItem>
                      <SelectItem value="batizado">Batizado</SelectItem>
                      <SelectItem value="aniversario">Aniversário</SelectItem>
                      <SelectItem value="corporativo">Corporativo</SelectItem>
                      <SelectItem value="maternidade">Maternidade</SelectItem>
                      <SelectItem value="bodas">Bodas</SelectItem>
                      <SelectItem value="formatura">Formatura</SelectItem>
                      <SelectItem value="cha_bebe">Chá de bebê</SelectItem>
                      <SelectItem value="revelacao">Revelação</SelectItem>
                      <SelectItem value="presente">Presente</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNovoCliente((v) => !v)}
                >
                  {showNovoCliente
                    ? 'Fechar cadastro rápido de cliente'
                    : '+ Cadastrar novo cliente'}
                </Button>
              </div>
              {showNovoCliente && (
                <div className="rounded-md border border-[#C69D5F] bg-[#F5EEE7] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Cadastrar novo cliente</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNovoCliente(false)}
                      disabled={criandoCliente}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="nc_nome">Nome *</Label>
                      <Input
                        id="nc_nome"
                        value={novoCliente.nome}
                        onChange={(e) =>
                          setNovoCliente((prev) => ({ ...prev, nome: e.target.value }))
                        }
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="nc_telefone">Telefone principal *</Label>
                      <Input
                        id="nc_telefone"
                        value={novoCliente.telefone}
                        onChange={(e) =>
                          setNovoCliente((prev) => ({ ...prev, telefone: e.target.value }))
                        }
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="nc_email">E-mail</Label>
                      <Input
                        id="nc_email"
                        type="email"
                        value={novoCliente.email}
                        onChange={(e) =>
                          setNovoCliente((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="cliente@email.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Natureza</Label>
                      <select
                        value={novoCliente.natureza}
                        onChange={(e) =>
                          setNovoCliente((prev) => ({ ...prev, natureza: e.target.value }))
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="pessoa_fisica">Pessoa Física</option>
                        <option value="pessoa_juridica">Pessoa Jurídica</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Classificação</Label>
                      <select
                        value={novoCliente.classificacao}
                        onChange={(e) =>
                          setNovoCliente((prev) => ({ ...prev, classificacao: e.target.value }))
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="cliente_padrao">Cliente padrão</option>
                        <option value="cerimonialista">Cerimonialista</option>
                        <option value="revendedor">Revendedor</option>
                        <option value="parceiro_comercial">Parceiro Comercial</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={criarClienteInline}
                    disabled={criandoCliente}
                    className="bg-[#C69D5F] hover:bg-[#DCC39E] text-white"
                  >
                    {criandoCliente ? 'Cadastrando...' : 'Salvar cliente e vincular'}
                  </Button>
                </div>
              )}

              {segmentoDerivado && (
                <p className="text-sm text-muted-foreground">
                  Segmento: {segmentoDerivado.replace('_', ' ')}
                </p>
              )}
              {formData.tipo_evento === 'aniversario' && (
                <div className="space-y-2">
                  <Label>Tipo de aniversário *</Label>
                  <Select onValueChange={(v) => handleChange('subtipo_evento', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="infantil">Infantil</SelectItem>
                      <SelectItem value="debutante_bar">Debutante / baile</SelectItem>
                      <SelectItem value="bat_mitzvah">Bat mitzvah</SelectItem>
                      <SelectItem value="adulto">Adulto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formData.tipo_evento === 'outros' && (
                <div className="space-y-2">
                  <Label>Justificativa *</Label>
                  <Input
                    value={formData.justificativa_outros}
                    onChange={(e) => handleChange('justificativa_outros', e.target.value)}
                    placeholder="Explique o tipo de evento"
                  />
                </div>
              )}
              {formData.tipo_evento === 'casamento' && (
                <div className="space-y-2">
                  <Label>Nome dos Noivos</Label>{' '}
                  <Input
                    value={formData.nome_noivos}
                    onChange={(e) => handleChange('nome_noivos', e.target.value)}
                  />
                </div>
              )}
              {segmentoDerivado === 'eventos_sociais' && formData.tipo_evento !== 'aniversario' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Aniversariante</Label>
                    <Input
                      value={formData.nome_aniversariante}
                      onChange={(e) => handleChange('nome_aniversariante', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Casal</Label>
                    <Input
                      value={formData.nome_casal}
                      onChange={(e) => handleChange('nome_casal', e.target.value)}
                    />
                  </div>
                </div>
              )}
              {segmentoDerivado === 'maternidade' && (
                <div className="space-y-2">
                  <Label>Nome do Bebê / criança</Label>{' '}
                  <Input
                    value={formData.nome_bebe}
                    onChange={(e) => handleChange('nome_bebe', e.target.value)}
                  />
                </div>
              )}
              {formData.tipo_evento === 'outros' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Justificativa do tipo de evento *</Label>
                    <Input
                      value={formData.justificativa_outros}
                      onChange={(e) => handleChange('justificativa_outros', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={formData.descricao_outro_evento}
                      onChange={(e) => handleChange('descricao_outro_evento', e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="source_ref">Identificador de origem (opcional)</Label>
                <Input
                  id="source_ref"
                  value={formData.source_ref}
                  onChange={(e) => handleChange('source_ref', e.target.value)}
                  placeholder="Ex.: whatsapp-2026-001"
                />
                <p className="text-xs text-muted-foreground">
                  Se repetido, o sistema pedirá uma decisão antes de criar outro registro.
                </p>
              </div>
              <div className="rounded-md border border-dashed p-3 space-y-2">
                <Label htmlFor="rollback_ref">Rollback de fixture (preserva o original)</Label>
                <div className="flex gap-2">
                  <Input
                    id="rollback_ref"
                    value={rollbackRef}
                    onChange={(e) => setRollbackRef(e.target.value)}
                    placeholder="source_ref da fixture"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={rollbackFixture}
                    disabled={loading || !rollbackRef.trim()}
                  >
                    Registrar rollback
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas registra a reversão de teste no histórico; não apaga nem altera o registro
                  original.
                </p>
              </div>

              {duplicata && (
                <div className="rounded-md border border-[#C69D5F] bg-[#F5EEE7] p-3 text-sm">
                  Possível duplicidade encontrada: {duplicata.id}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_estimado">Valor Estimado (R$)</Label>
                  <Input
                    id="valor_estimado"
                    type="number"
                    step="0.01"
                    value={formData.valor_estimado}
                    onChange={(e) => handleChange('valor_estimado', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_evento">Data do Evento</Label>
                  <Input
                    id="data_evento"
                    type="date"
                    value={formData.data_evento}
                    onChange={(e) => handleChange('data_evento', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qtd_convidados">Quantidade de Convidados</Label>
                  <Input
                    id="qtd_convidados"
                    type="number"
                    value={formData.qtd_convidados}
                    onChange={(e) => handleChange('qtd_convidados', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qtd_bem_casados">Quantidade de Bem-Casados</Label>
                  <Input
                    id="qtd_bem_casados"
                    type="number"
                    value={formData.qtd_bem_casados}
                    onChange={(e) => handleChange('qtd_bem_casados', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="local_evento">Local do Evento</Label>
                <Input
                  id="local_evento"
                  value={formData.local_evento}
                  onChange={(e) => handleChange('local_evento', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proxima_acao">Próxima Ação</Label>
                  <Input
                    id="proxima_acao"
                    value={formData.proxima_acao}
                    onChange={(e) => handleChange('proxima_acao', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prazo_proxima_acao">Prazo Próxima Ação</Label>
                  <Input
                    id="prazo_proxima_acao"
                    type="date"
                    value={formData.prazo_proxima_acao}
                    onChange={(e) => handleChange('prazo_proxima_acao', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="bg-[#C69D5F] hover:bg-[#DCC39E] text-white"
                  disabled={loading}
                >
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
