import { useState } from 'react'
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

const PHONE_COUNTRIES = [
  ['br', 'Brasil (+55)'],
  ['international', 'Outro país'],
]

const formatBrazilPhone = (value) => {
  const digits = value.replace(/\D/g, '').replace(/^55/, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const normalizeInternationalPhone = (value) => {
  const digits = value.replace(/[^\d+]/g, '')
  return digits.startsWith('+')
    ? `+${digits.slice(1).replace(/\D/g, '')}`
    : `+${digits.replace(/\D/g, '')}`
}

const formatPhone = (value, country) =>
  country === 'br' ? formatBrazilPhone(value) : normalizeInternationalPhone(value)

const NovoCliente = () => {
  const [formData, setFormData] = useState({
    nome: '',
    telefone_principal: '',
    telefone_secundario: '',
    email: '',
    tipo_cliente: '',
    cpf_cnpj: '',
    origem_contato: '',
    empresa_nome: '',
    contato_nome: '',
    contato_telefone: '',
    nome_noivos: '',
    nome_aniversariante: '',
    nome_casal: '',
    nome_bebe: '',
    nome_presenteado: '',
    tipo_outro: '',
    descricao_outro: '',
    observacoes: '',
  })
  const [phoneCountry, setPhoneCountry] = useState({
    principal: 'br',
    secundario: 'br',
    contato: 'br',
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const segment = formData.tipo_cliente

  const handleChange = (field, value) => {
    if (field === 'telefone_principal') value = formatPhone(value, phoneCountry.principal)
    if (field === 'telefone_secundario') value = formatPhone(value, phoneCountry.secundario)
    if (field === 'contato_telefone') value = formatPhone(value, phoneCountry.contato)
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'tipo_cliente' && value === 'cerimonialista') next.empresa_nome = prev.nome
      if (field === 'nome' && prev.tipo_cliente === 'cerimonialista') next.empresa_nome = value
      return next
    })
  }

  const changePhoneCountry = (field, country) => {
    setPhoneCountry((prev) => ({ ...prev, [field]: country }))
    const dataField =
      field === 'principal'
        ? 'telefone_principal'
        : field === 'secundario'
          ? 'telefone_secundario'
          : 'contato_telefone'
    setFormData((prev) => ({ ...prev, [dataField]: formatPhone(prev[dataField], country) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nome.trim() || !formData.telefone_principal.trim() || !segment) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Nome, telefone principal e segmento são obrigatórios',
        variant: 'destructive',
      })
      return
    }
    if (
      segment === 'cerimonialista' &&
      (!formData.contato_nome.trim() || !formData.contato_telefone.trim())
    ) {
      toast({
        title: 'Contato obrigatório',
        description: 'Informe o nome e o telefone do contato da cerimonialista',
        variant: 'destructive',
      })
      return
    }
    if (segment === 'outros' && (!formData.tipo_outro.trim() || !formData.descricao_outro.trim())) {
      toast({
        title: 'Detalhes obrigatórios',
        description: 'Informe o tipo e a descrição do evento',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const dataToSend = { ...formData }
      if (segment === 'cerimonialista') dataToSend.empresa_nome = formData.nome
      Object.keys(dataToSend).forEach((key) => {
        if (dataToSend[key] === '') delete dataToSend[key]
      })
      await pb.collection('clientes').create(dataToSend)
      toast({
        title: 'Cliente criado com sucesso!',
        description: 'O registro foi salvo no sistema',
      })
      navigate('/')
    } catch (error) {
      toast({
        title: 'Erro ao criar cliente',
        description: error?.response?.message || error?.message || 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const conditionalFields = () => {
    if (segment === 'casamento_noiva')
      return (
        <Field
          id="nome_noivos"
          label="Nome dos Noivos"
          value={formData.nome_noivos}
          onChange={handleChange}
        />
      )
    if (segment === 'eventos_sociais')
      return (
        <>
          <Field
            id="nome_aniversariante"
            label="Nome do Aniversariante (opcional)"
            value={formData.nome_aniversariante}
            onChange={handleChange}
          />
          <Field
            id="nome_casal"
            label="Nome do Casal (opcional)"
            value={formData.nome_casal}
            onChange={handleChange}
          />
        </>
      )
    if (segment === 'maternidade')
      return (
        <Field
          id="nome_bebe"
          label="Nome do Bebê (opcional)"
          value={formData.nome_bebe}
          onChange={handleChange}
        />
      )
    if (segment === 'corporativo')
      return (
        <>
          <Field
            id="empresa_nome"
            label="Nome da Empresa"
            value={formData.empresa_nome}
            onChange={handleChange}
          />
          <Field
            id="contato_nome"
            label="Nome do Contato Principal"
            value={formData.contato_nome}
            onChange={handleChange}
          />
          <PhoneField
            id="contato_telefone"
            label="Telefone do Contato Principal"
            value={formData.contato_telefone}
            country={phoneCountry.contato}
            onCountryChange={(v) => changePhoneCountry('contato', v)}
            onChange={handleChange}
          />
        </>
      )
    if (segment === 'cerimonialista')
      return (
        <>
          <p className="text-sm text-muted-foreground rounded-md bg-[#F5EEE7] p-3">
            A empresa será cadastrada como{' '}
            <strong>{formData.nome || 'o nome informado acima'}</strong>. Não é necessário repetir.
          </p>
          <Field
            id="contato_nome"
            label="Nome do Contato"
            value={formData.contato_nome}
            onChange={handleChange}
            required
          />
          <PhoneField
            id="contato_telefone"
            label="Telefone do Contato"
            value={formData.contato_telefone}
            country={phoneCountry.contato}
            onCountryChange={(v) => changePhoneCountry('contato', v)}
            onChange={handleChange}
            required
          />
        </>
      )
    if (segment === 'revenda_parceiros')
      return (
        <Field
          id="empresa_nome"
          label="Nome do Grupo ou Empresa"
          value={formData.empresa_nome}
          onChange={handleChange}
        />
      )
    if (segment === 'presentes')
      return (
        <Field
          id="nome_presenteado"
          label="Nome da Pessoa Presenteada"
          value={formData.nome_presenteado}
          onChange={handleChange}
        />
      )
    if (segment === 'outros')
      return (
        <>
          <Field
            id="tipo_outro"
            label="Tipo de Evento"
            value={formData.tipo_outro}
            onChange={handleChange}
            required
          />
          <Field
            id="descricao_outro"
            label="Descrição do Caso"
            value={formData.descricao_outro}
            onChange={handleChange}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  id="nome"
                  label="Nome *"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                />
                <PhoneField
                  id="telefone_principal"
                  label="Telefone Principal *"
                  value={formData.telefone_principal}
                  country={phoneCountry.principal}
                  onCountryChange={(v) => changePhoneCountry('principal', v)}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PhoneField
                  id="telefone_secundario"
                  label="Telefone Secundário (opcional)"
                  value={formData.telefone_secundario}
                  country={phoneCountry.secundario}
                  onCountryChange={(v) => changePhoneCountry('secundario', v)}
                  onChange={handleChange}
                />
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  id="cpf_cnpj"
                  label="CPF/CNPJ"
                  value={formData.cpf_cnpj}
                  onChange={handleChange}
                />
                <div className="space-y-2">
                  <Label htmlFor="origem_contato">Origem do Contato</Label>
                  <Select
                    value={formData.origem_contato}
                    onValueChange={(v) => handleChange('origem_contato', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'whatsapp',
                        'telefone',
                        'email',
                        'presencial',
                        'indicacao',
                        'instagram',
                        'site',
                        'outro',
                      ].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_cliente">Segmento *</Label>
                <Select value={segment} onValueChange={(v) => handleChange('tipo_cliente', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {conditionalFields()}
              <Field
                id="observacoes"
                label="Observações"
                value={formData.observacoes}
                onChange={handleChange}
              />
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

const Field = ({ id, label, value, onChange, type = 'text', required = false }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(id, e.target.value)}
      required={required}
    />
  </div>
)

const PhoneField = ({ id, label, value, country, onCountryChange, onChange, required = false }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex gap-2">
      <Select value={country} onValueChange={onCountryChange}>
        <SelectTrigger className="w-[145px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PHONE_COUNTRIES.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        required={required}
        placeholder={country === 'br' ? '(11) 99999-9999' : '+ código do país e número'}
      />
    </div>
  </div>
)

export default NovoCliente
