import { useEffect, useRef, useState } from 'react'
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

const ORIGINS = [
  ['instagram', 'Instagram'],
  ['google', 'Google'],
  ['tiktok', 'TikTok'],
  ['indicacao', 'Indicação'],
  ['cerimonialista', 'Cerimonialista'],
  ['parceiro_comercial', 'Parceiro Comercial'],
  ['ifood', 'iFood'],
  ['outro', 'Outro'],
]
const CATEGORIES = [
  ['profissional_mercado', 'Profissional do mercado'],
  ['outra_noiva_cliente', 'Outra noiva/cliente'],
  ['parente', 'Parente'],
  ['amigo_conhecido', 'Amigo/conhecido'],
  ['outro', 'Outro'],
  ['nao_informado', 'Não informado'],
]
const CLASSIFICATIONS = [
  ['cliente_padrao', 'Cliente padrão'],
  ['cerimonialista', 'Cerimonialista'],
  ['revendedor', 'Revendedor'],
  ['parceiro_comercial', 'Parceiro Comercial'],
]
const formatPhone = (value, country = 'brasil') => {
  if (country === 'outro') return value
  const d = value.replace(/\D/g, '').replace(/^55/, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
const Field = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
}) => (
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

export default function NovoCliente() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const requestRef = useRef(0)
  const [natureza, setNatureza] = useState('pessoa_fisica')
  const [classificacao, setClassificacao] = useState('cliente_padrao')
  const [pais, setPais] = useState('brasil')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [origem, setOrigem] = useState('')
  const [categoria, setCategoria] = useState('')
  const [referencia, setReferencia] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [existente, setExistente] = useState(null)
  const [usandoExistente, setUsandoExistente] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [indicador, setIndicador] = useState(null)
  const [indicadorBusca, setIndicadorBusca] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const phone = pais === 'brasil' ? telefone.replace(/\D/g, '') : telefone.trim()
    setExistente(null)
    setUsandoExistente(false)
    if (phone.length < 10) {
      setBuscando(false)
      return
    }
    const id = ++requestRef.current
    const timer = window.setTimeout(async () => {
      setBuscando(true)
      try {
        const r = await pb
          .collection('pessoas')
          .getList(1, 1, { filter: `telefone_principal = "${phone}"` })
        if (id === requestRef.current) {
          setExistente(r.items[0] || null)
          setUsandoExistente(Boolean(r.items[0]))
        }
      } catch {
      } finally {
        if (id === requestRef.current) setBuscando(false)
      }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [telefone, pais])

  const buscarIndicador = async () => {
    if (!indicadorBusca.trim()) return
    try {
      const r = await pb
        .collection('pessoas')
        .getList(1, 1, {
          filter: `nome ~ "${indicadorBusca.trim()}" || telefone_principal ~ "${indicadorBusca.trim()}"`,
        })
      setIndicador(r.items[0] || null)
    } catch {
      toast({ title: 'Não foi possível pesquisar o indicador', variant: 'destructive' })
    }
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!pb.authStore.isValid) {
      window.location.assign('/login')
      return
    }
    const phone = pais === 'brasil' ? telefone.replace(/\D/g, '') : telefone.trim()
    if (!nome.trim() || !phone || !natureza || !classificacao) {
      toast({
        title: 'Nome, telefone, natureza e classificação são obrigatórios',
        variant: 'destructive',
      })
      return
    }
    if (origem === 'indicacao' && !categoria) {
      toast({ title: 'Informe a categoria da indicação', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      let pessoa = usandoExistente && existente ? existente : null
      if (!pessoa) {
        const r = await pb
          .collection('pessoas')
          .getList(1, 1, { filter: `telefone_principal = "${phone}"` })
        pessoa = r.items[0] || null
      }
      const clienteData = {
        nome: nome.trim(),
        telefone_principal: phone,
        situacao: 'ativo',
        natureza_cadastral: natureza,
        classificacao_comercial: classificacao,
        ...(email ? { email } : {}),
        ...(cpfCnpj ? { cpf_cnpj: cpfCnpj } : {}),
        ...(origem ? { origem_cliente: origem } : {}),
        ...(categoria ? { categoria_indicacao: categoria } : {}),
        ...(referencia ? { referencia_origem: referencia } : {}),
        ...(indicador ? { indicador_pessoa_id: indicador.id } : {}),
        ...(observacoes ? { observacoes } : {}),
      }
      const cliente = await pb.collection('clientes').create(clienteData)
      if (!pessoa) {
        try {
          pessoa = await pb
            .collection('pessoas')
            .create({
              nome: nome.trim(),
              telefone_principal: phone,
              ...(email ? { email } : {}),
              ...(cpfCnpj && natureza === 'pessoa_fisica' ? { cpf: cpfCnpj } : {}),
            })
        } catch {}
      }
      if (pessoa) {
        try {
          await pb
            .collection('clientes_pessoas')
            .create({ cliente_id: cliente.id, pessoa_id: pessoa.id, papel: 'titular' })
        } catch {}
      }
      toast({ title: 'Cliente criado com sucesso!' })
      navigate('/')
    } catch (error) {
      toast({
        title: 'Não foi possível salvar o cliente',
        description: error?.response?.data?.message || error?.message || 'Tente novamente',
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
          <h1 className="text-xl font-bold">Novo Cliente</h1>
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Cadastro progressivo</CardTitle>
          </CardHeader>
          <CardContent>
            <form noValidate onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Natureza cadastral *</Label>
                  <Select value={natureza} onValueChange={setNatureza}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                      <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Classificação comercial *</Label>
                  <Select value={classificacao} onValueChange={setClassificacao}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSIFICATIONS.map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Field
                id="nome"
                label={natureza === 'pessoa_juridica' ? 'Nome / Nome Fantasia *' : 'Nome *'}
                value={nome}
                onChange={setNome}
                required
              />
              <div className="space-y-2">
                <Label>Telefone principal *</Label>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                  <Select
                    value={pais}
                    onValueChange={(v) => {
                      setPais(v)
                      setTelefone(formatPhone(telefone, v))
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brasil">Brasil</SelectItem>
                      <SelectItem value="outro">Outro país</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="telefone"
                    type="tel"
                    className="min-w-0 w-full"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value, pais))}
                    required
                    placeholder={
                      pais === 'brasil' ? '(XX) XXXXX-XXXX' : '+ código do país e telefone'
                    }
                  />
                </div>
              </div>
              {existente && (
                <div className="rounded-md border border-[#C69D5F] bg-[#F5EEE7] p-3 text-sm">
                  <strong>Telefone já cadastrado:</strong> {existente.nome}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => setUsandoExistente(true)}>
                      Usar este cadastro
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setUsandoExistente(false)}
                    >
                      Criar novo e revisar depois
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field id="email" label="E-mail" type="email" value={email} onChange={setEmail} />
                <Field
                  id="cpf_cnpj"
                  label={natureza === 'pessoa_fisica' ? 'CPF (opcional)' : 'CNPJ (opcional)'}
                  value={cpfCnpj}
                  onChange={setCpfCnpj}
                />
              </div>
              <div className="space-y-2">
                <Label>Origem do cliente</Label>
                <Select value={origem} onValueChange={setOrigem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione, se souber" />
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
              {origem === 'indicacao' && (
                <div className="rounded-md border p-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Categoria da indicação *</Label>
                    <Select value={categoria} onValueChange={setCategoria}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(([v, l]) => (
                          <SelectItem key={v} value={v}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={indicadorBusca}
                      onChange={(e) => setIndicadorBusca(e.target.value)}
                      placeholder="Buscar quem indicou"
                    />
                    <Button type="button" variant="outline" onClick={buscarIndicador}>
                      Buscar
                    </Button>
                  </div>
                  {indicador && (
                    <p className="text-sm">
                      <strong>Indicador:</strong> {indicador.nome}
                    </p>
                  )}
                  <Field
                    id="referencia"
                    label="Referência livre (opcional)"
                    value={referencia}
                    onChange={setReferencia}
                    placeholder="Ex.: indicação da sogra"
                  />
                </div>
              )}
              <Field
                id="observacoes"
                label="Observações"
                value={observacoes}
                onChange={setObservacoes}
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
