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

const SEGMENTS = [
  ['casamento_noiva', 'Casamento / Noiva'],
  ['eventos_sociais', 'Eventos sociais'],
  ['maternidade', 'Maternidade'],
  ['corporativo', 'Corporativo'],
  ['cerimonialista', 'Cerimonialista'],
  ['revenda_parceiros', 'Revenda / Parceiros comerciais'],
  ['presentes', 'Presentes'],
  ['consumo_proprio', 'Consumo próprio'],
  ['outros', 'Outros'],
]

const ORIGINS = [
  ['whatsapp', 'WhatsApp'],
  ['telefone', 'Telefone'],
  ['email', 'Email'],
  ['presencial', 'Presencial'],
  ['indicacao', 'Indicação'],
  ['instagram', 'Instagram'],
  ['site', 'Site'],
  ['outro', 'Outro'],
]

const formatPhone = (value) => {
  const d = value.replace(/\D/g, '').replace(/^55/, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const NovoCliente = () => {
  const [segment, setSegment] = useState('')
  const [nome, setNome] = useState('')
  const [telPrincipal, setTelPrincipal] = useState('')
  const [telSecundario, setTelSecundario] = useState('')
  const [email, setEmail] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [origem, setOrigem] = useState('')
  const [empresaNome, setEmpresaNome] = useState('')
  const [contatoNome, setContatoNome] = useState('')
  const [contatoTel, setContatoTel] = useState('')
  const [nomeNoivos, setNomeNoivos] = useState('')
  const [nomeAniversariante, setNomeAniversariante] = useState('')
  const [nomeCasal, setNomeCasal] = useState('')
  const [nomeBebe, setNomeBebe] = useState('')
  const [nomePresenteado, setNomePresenteado] = useState('')
  const [tipoOutro, setTipoOutro] = useState('')
  const [descOutro, setDescOutro] = useState('')
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (segment === 'cerimonialista' && nome) setEmpresaNome(nome)
  }, [segment, nome])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    if (!telPrincipal.trim()) {
      toast({ title: 'Telefone principal obrigatório', variant: 'destructive' })
      return
    }
    if (!segment) {
      toast({ title: 'Selecione o tipo de cliente', variant: 'destructive' })
      return
    }
    if (segment === 'cerimonialista' && (!contatoNome.trim() || !contatoTel.trim())) {
      toast({ title: 'Contato obrigatório para cerimonialista', variant: 'destructive' })
      return
    }
    if (segment === 'outros' && (!tipoOutro.trim() || !descOutro.trim())) {
      toast({ title: 'Tipo e descrição obrigatórios para "Outros"', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const data = {
        nome: nome.trim(),
        telefone_principal: telPrincipal.replace(/\D/g, ''),
        tipo_cliente: segment,
      }
      if (telSecundario) data.telefone_secundario = telSecundario.replace(/\D/g, '')
      if (email) data.email = email
      if (cpfCnpj) data.cpf_cnpj = cpfCnpj
      if (origem) data.origem_contato = origem
      if (segment === 'cerimonialista') {
        data.empresa_nome = empresaNome || nome.trim()
        data.contato_nome = contatoNome
        data.contato_telefone = contatoTel.replace(/\D/g, '')
      }
      if (segment === 'corporativo') {
        if (empresaNome) data.empresa_nome = empresaNome
        if (contatoNome) data.contato_nome = contatoNome
        if (contatoTel) data.contato_telefone = contatoTel.replace(/\D/g, '')
      }
      if (segment === 'casamento_noiva' && nomeNoivos) data.nome_noivos = nomeNoivos
      if (segment === 'eventos_sociais') {
        if (nomeAniversariante) data.nome_aniversariante = nomeAniversariante
        if (nomeCasal) data.nome_casal = nomeCasal
      }
      if (segment === 'maternidade' && nomeBebe) data.nome_bebe = nomeBebe
      if (segment === 'revenda_parceiros' && empresaNome) data.empresa_nome = empresaNome
      if (segment === 'presentes' && nomePresenteado) data.nome_presenteado = nomePresenteado
      if (segment === 'outros') {
        data.tipo_outro = tipoOutro
        data.descricao_outro = descOutro
      }
      if (obs) data.observacoes = obs

      await pb.collection('clientes').create(data)
      toast({ title: 'Cliente criado com sucesso!' })
      navigate('/')
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        'Erro desconhecido'
      toast({ title: 'Erro ao criar cliente', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const conditionalFields = () => {
    if (segment === 'casamento_noiva')
      return (
        <F id="nome_noivos" label="Nome dos Noivos" value={nomeNoivos} onChange={setNomeNoivos} />
      )
    if (segment === 'eventos_sociais')
      return (
        <>
          <F
            id="nome_aniversariante"
            label="Nome do Aniversariante (opcional)"
            value={nomeAniversariante}
            onChange={setNomeAniversariante}
          />
          <F
            id="nome_casal"
            label="Nome do Casal (opcional)"
            value={nomeCasal}
            onChange={setNomeCasal}
          />
        </>
      )
    if (segment === 'maternidade')
      return (
        <F id="nome_bebe" label="Nome do Bebê (opcional)" value={nomeBebe} onChange={setNomeBebe} />
      )
    if (segment === 'corporativo')
      return (
        <>
          <F
            id="empresa_nome"
            label="Nome da Empresa"
            value={empresaNome}
            onChange={setEmpresaNome}
          />
          <F
            id="contato_nome"
            label="Nome do Contato Principal"
            value={contatoNome}
            onChange={setContatoNome}
          />
          <F
            id="contato_telefone"
            label="Telefone do Contato Principal"
            value={contatoTel}
            onChange={(v) => setContatoTel(formatPhone(v))}
            placeholder="(XX) XXXXX-XXXX"
          />
        </>
      )
    if (segment === 'cerimonialista')
      return (
        <>
          <p className="text-sm text-muted-foreground rounded-md bg-[#F5EEE7] p-3">
            A empresa será cadastrada como <strong>{nome || 'o nome informado acima'}</strong>
          </p>
          <F
            id="contato_nome"
            label="Nome do Contato *"
            value={contatoNome}
            onChange={setContatoNome}
            required
          />
          <F
            id="contato_telefone"
            label="Telefone do Contato *"
            value={contatoTel}
            onChange={(v) => setContatoTel(formatPhone(v))}
            required
            placeholder="(XX) XXXXX-XXXX"
          />
        </>
      )
    if (segment === 'revenda_parceiros')
      return (
        <F
          id="empresa_nome"
          label="Nome do Grupo ou Empresa"
          value={empresaNome}
          onChange={setEmpresaNome}
        />
      )
    if (segment === 'presentes')
      return (
        <F
          id="nome_presenteado"
          label="Nome da Pessoa Presenteada"
          value={nomePresenteado}
          onChange={setNomePresenteado}
        />
      )
    if (segment === 'outros')
      return (
        <>
          <F
            id="tipo_outro"
            label="Tipo de Evento"
            value={tipoOutro}
            onChange={setTipoOutro}
            required
          />
          <F
            id="descricao_outro"
            label="Descrição do Caso"
            value={descOutro}
            onChange={setDescOutro}
            required
          />
        </>
      )
    return null
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="bg-[#3D2314] text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold">Novo Cliente</h1>
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Cadastro de Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Cliente *</Label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F id="nome" label="Nome *" value={nome} onChange={setNome} required />
                <F
                  id="telefone_principal"
                  label="Telefone Principal *"
                  value={telPrincipal}
                  onChange={(v) => setTelPrincipal(formatPhone(v))}
                  required
                  placeholder="(XX) XXXXX-XXXX"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F
                  id="telefone_secundario"
                  label="Telefone Secundário (opcional)"
                  value={telSecundario}
                  onChange={(v) => setTelSecundario(formatPhone(v))}
                  placeholder="(XX) XXXXX-XXXX"
                />
                <F id="email" label="Email" type="email" value={email} onChange={setEmail} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F id="cpf_cnpj" label="CPF/CNPJ" value={cpfCnpj} onChange={setCpfCnpj} />
                <div className="space-y-2">
                  <Label>Origem do Contato</Label>
                  <Select value={origem} onValueChange={setOrigem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGINS.map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {conditionalFields()}
              <F id="observacoes" label="Observações" value={obs} onChange={setObs} />
              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="bg-[#C69D5F] hover:bg-[#DCC39E] text-white"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Cliente'}
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

const F = ({ id, label, value, onChange, type = 'text', required = false, placeholder = '' }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
    />
  </div>
)

export default NovoCliente
