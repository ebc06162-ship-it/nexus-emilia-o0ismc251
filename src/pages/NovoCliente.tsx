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
import AppShell from '@/components/AppShell'
import { ArrowLeft, Check, Search, UserCheck } from 'lucide-react'

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
const formatPhone = (value: string, country = 'brasil') => {
  if (country === 'outro') return value
  const d = value.replace(/\D/g, '').replace(/^55/, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (val: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}

const Field = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
}: FieldProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs font-medium text-[#5C4A32]">
      {label}
    </Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-xs py-2 text-[#5C4A32] focus:border-[#B08A3E] focus:ring-[#B08A3E]/30"
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
  const [existente, setExistente] = useState<any>(null)
  const [usandoExistente, setUsandoExistente] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [indicador, setIndicador] = useState<any>(null)
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
      } catch (error) {
        console.warn('Falha ao consultar telefone', error)
      } finally {
        if (id === requestRef.current) setBuscando(false)
      }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [telefone, pais])

  const buscarIndicador = async () => {
    if (!indicadorBusca.trim()) return
    try {
      const r = await pb.collection('pessoas').getList(1, 1, {
        filter: `nome ~ "${indicadorBusca.trim()}" || telefone_principal ~ "${indicadorBusca.trim()}"`,
      })
      setIndicador(r.items[0] || null)
    } catch (error) {
      console.warn('Falha ao pesquisar indicador', error)
      toast({ title: 'Não foi possível pesquisar o indicador', variant: 'destructive' })
    }
  }

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
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
          pessoa = await pb.collection('pessoas').create({
            nome: nome.trim(),
            telefone_principal: phone,
            ...(email ? { email } : {}),
            ...(cpfCnpj && natureza === 'pessoa_fisica' ? { cpf: cpfCnpj } : {}),
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
      toast({ title: 'Cliente criado com sucesso!' })
      navigate('/')
    } catch (error: any) {
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
    <AppShell
      title="Novo Cliente"
      subtitle="Cadastro progressivo e qualificação comercial de clientes Emília"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] text-xs rounded-xl flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Voltar ao painel
        </Button>

        <Card className="bg-[#FDFAF5] border-[#E8DEC8] rounded-2xl shadow-card overflow-hidden">
          <CardHeader className="pb-4 border-b border-[#E8DEC8]/50">
            <CardTitle className="font-serif text-title-min md:text-xl font-semibold text-[#5C4A32]">
              Ficha do Cliente
            </CardTitle>
            <p className="text-xs text-[#8A7A66]">
              Preencha as informações básicas para iniciar o atendimento.
            </p>
          </CardHeader>
          <CardContent className="pt-5">
            <form noValidate onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="natureza-cadastral"
                    className="text-xs font-medium text-[#5C4A32]"
                  >
                    Natureza cadastral *
                  </Label>
                  <select
                    id="natureza-cadastral"
                    value={natureza}
                    onChange={(e) => setNatureza(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-[#FDFAF5] px-3 py-2 text-xs text-[#5C4A32] focus:border-[#B08A3E] focus:ring-[#B08A3E]/30"
                  >
                    <option value="pessoa_fisica">Pessoa Física</option>
                    <option value="pessoa_juridica">Pessoa Jurídica</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="classificacao-comercial"
                    className="text-xs font-medium text-[#5C4A32]"
                  >
                    Classificação comercial *
                  </Label>
                  <select
                    id="classificacao-comercial"
                    value={classificacao}
                    onChange={(e) => setClassificacao(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-[#E8DEC8] bg-[#FDFAF5] px-3 py-2 text-xs text-[#5C4A32] focus:border-[#B08A3E] focus:ring-[#B08A3E]/30"
                  >
                    {CLASSIFICATIONS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Field
                id="nome"
                label={natureza === 'pessoa_juridica' ? 'Nome / Nome Fantasia *' : 'Nome *'}
                value={nome}
                onChange={setNome}
                required
              />

              <div className="space-y-1.5">
                <Label htmlFor="telefone" className="text-xs font-medium text-[#5C4A32]">
                  Telefone principal *
                </Label>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                  <Select
                    value={pais}
                    onValueChange={(v) => {
                      setPais(v)
                      setTelefone(formatPhone(telefone, v))
                    }}
                  >
                    <SelectTrigger className="w-32 rounded-xl border-[#E8DEC8] bg-[#FDFAF5] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#FDFAF5] border-[#E8DEC8]">
                      <SelectItem value="brasil">Brasil</SelectItem>
                      <SelectItem value="outro">Outro país</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="telefone"
                    type="tel"
                    className="min-w-0 w-full rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-xs py-2 text-[#5C4A32]"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value, pais))}
                    required
                    placeholder={
                      pais === 'brasil' ? '(XX) XXXXX-XXXX' : '+ código do país e telefone'
                    }
                  />
                </div>
                {buscando && (
                  <p className="text-[11px] text-[#8A7A66]">Consultando cadastro existente...</p>
                )}
              </div>

              {existente && (
                <div className="rounded-xl border border-[#D6BC7E] bg-[#F4EEDA] p-3 text-xs text-[#5C4A32]">
                  <p className="font-semibold flex items-center gap-1.5">
                    <UserCheck size={14} className="text-[#B08A3E]" />
                    Telefone já cadastrado: {existente.nome}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setUsandoExistente(true)}
                      className="bg-[#5C4A32] text-white hover:bg-[#473926] text-xs rounded-lg"
                    >
                      <Check size={12} className="mr-1" /> Usar este cadastro
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setUsandoExistente(false)}
                      className="border-[#D6BC7E] text-[#5C4A32] text-xs rounded-lg hover:bg-white"
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

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#5C4A32]">Origem do cliente</Label>
                <Select value={origem} onValueChange={setOrigem}>
                  <SelectTrigger className="rounded-xl border-[#E8DEC8] bg-[#FDFAF5] text-xs text-[#5C4A32]">
                    <SelectValue placeholder="Selecione, se souber" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#FDFAF5] border-[#E8DEC8]">
                    {ORIGINS.map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {origem === 'indicacao' && (
                <div className="rounded-xl border border-[#E8DEC8] bg-[#FBF7F0] p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#5C4A32]">
                      Categoria da indicação *
                    </Label>
                    <Select value={categoria} onValueChange={setCategoria}>
                      <SelectTrigger className="rounded-xl border-[#E8DEC8] bg-[#FDFAF5] text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#FDFAF5] border-[#E8DEC8]">
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
                      placeholder="Buscar quem indicou (nome ou telefone)"
                      className="rounded-xl bg-[#FDFAF5] border-[#E8DEC8] text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={buscarIndicador}
                      className="border-[#D6BC7E] text-[#5C4A32] text-xs rounded-xl hover:bg-[#F4EEDA]"
                    >
                      <Search size={13} className="mr-1" />
                      Buscar
                    </Button>
                  </div>
                  {indicador && (
                    <p className="text-xs text-[#5C4A32] bg-[#FDFAF5] p-2 rounded-lg border border-[#E8DEC8]">
                      <strong>Indicador:</strong> {indicador.nome}
                    </p>
                  )}
                  <Field
                    id="referencia"
                    label="Referência livre (opcional)"
                    value={referencia}
                    onChange={setReferencia}
                    placeholder="Ex.: indicação da noiva Mariana"
                  />
                </div>
              )}

              {classificacao === 'cerimonialista' && (
                <p className="text-xs text-[#8A7A66] rounded-xl bg-[#F4EEDA] p-3 border border-[#E5D7B7]">
                  Cerimonialista pode ser PF ou PJ. Os contatos e a equipe serão complementados no
                  mesmo relacionamento.
                </p>
              )}
              {classificacao === 'parceiro_comercial' && (
                <p className="text-xs text-[#8A7A66] rounded-xl bg-[#F4EEDA] p-3 border border-[#E5D7B7]">
                  Parceiro pode ser pessoa ou empresa. CPF/CNPJ não é obrigatório para começar.
                </p>
              )}

              <Field
                id="observacoes"
                label="Observações"
                value={observacoes}
                onChange={setObservacoes}
              />

              <div className="flex items-center gap-3 pt-3 border-t border-[#E8DEC8]">
                <Button
                  type="button"
                  onClick={submit}
                  className="bg-[#5C4A32] hover:bg-[#473926] text-[#FDFAF5] text-xs px-5 py-2.5 rounded-xl shadow-xs"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Cliente'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="border-[#E8DEC8] text-[#5C4A32] hover:bg-[#F5EFE6] text-xs rounded-xl"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </AppShell>
  )
}
