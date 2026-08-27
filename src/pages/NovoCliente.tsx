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
  if (country === 'outro') return value.slice(0, 30)
  const d = value.replace(/\D/g, '').replace(/^55/, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
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

const NovoCliente = () => {
  const [natureza, setNatureza] = useState('pessoa_fisica')
  const [classificacao, setClassificacao] = useState('cliente_padrao')
  const [paisTelefone, setPaisTelefone] = useState('brasil')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [origem, setOrigem] = useState('')
  const [categoria, setCategoria] = useState('')
  const [referencia, setReferencia] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [pessoaExistente, setPessoaExistente] = useState(null)
  const [buscandoPessoa, setBuscandoPessoa] = useState(false)
  const [usarPessoaExistente, setUsarPessoaExistente] = useState(false)
  const [indicadorBusca, setIndicadorBusca] = useState('')
  const [indicador, setIndicador] = useState(null)
  const [buscandoIndicador, setBuscandoIndicador] = useState(false)
  const [loading, setLoading] = useState(false)
  const buscaTelefoneRef = useRef(0)
  const navigate = useNavigate()
  const { toast } = useToast()

  const consultarPessoaPorTelefone = async (phone) => {
    const requestId = ++buscaTelefoneRef.current
    setBuscandoPessoa(true)
    try {
      const result = await pb
        .collection('pessoas')
        .getList(1, 5, { filter: `telefone_principal = "${phone}"` })
      if (requestId !== buscaTelefoneRef.current) return
      const pessoa = result.items[0] || null
      setPessoaExistente(pessoa)
      setUsarPessoaExistente(Boolean(pessoa))
      if (pessoa)
        toast({
          title: 'Telefone já cadastrado',
          description: `${pessoa.nome} já existe na base. Você pode reutilizar a Pessoa.`,
        })
    } catch (error) {
      if (requestId === buscaTelefoneRef.current)
        toast({
          title: 'Não foi possível verificar o telefone',
          description: error?.message || 'Tente novamente',
          variant: 'destructive',
        })
    } finally {
      if (requestId === buscaTelefoneRef.current) setBuscandoPessoa(false)
    }
  }

  useEffect(() => {
    const phone = paisTelefone === 'brasil' ? telefone.replace(/\D/g, '') : telefone.trim()
    setPessoaExistente(null)
    setUsarPessoaExistente(false)
    if (phone.length < 10) {
      setBuscandoPessoa(false)
      return
    }
    const timer = window.setTimeout(() => consultarPessoaPorTelefone(phone), 450)
    return () => window.clearTimeout(timer)
  }, [telefone, paisTelefone])

  const buscarIndicador = async () => {
    if (!indicadorBusca.trim()) return
    setBuscandoIndicador(true)
    try {
      const result = await pb.collection('pessoas').getList(1, 5, {
        filter: `nome ~ "${indicadorBusca.trim()}" || telefone_principal ~ "${indicadorBusca.trim()}"`,
      })
      setIndicador(result.items[0] || null)
      if (result.items[0])
        toast({ title: 'Indicador encontrado', description: result.items[0].nome })
      else
        toast({
          title: 'Indicador não encontrado',
          description: 'Você pode usar a referência livre ou cadastrar apenas o nome depois.',
        })
    } catch (error) {
      toast({ title: 'Não foi possível pesquisar o indicador', variant: 'destructive' })
    } finally {
      setBuscandoIndicador(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pb.authStore.isValid || !pb.authStore.record?.id) {
      window.location.assign('/login')
      return
    }
    if (!nome.trim() || !telefone.trim() || !natureza || !classificacao) {
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
      const phone = paisTelefone === 'brasil' ? telefone.replace(/\D/g, '') : telefone.trim()
      const pessoa =
        usarPessoaExistente && pessoaExistente
          ? pessoaExistente
          : await pb.collection('pessoas').create({
              nome: nome.trim(),
              telefone_principal: phone,
              ...(email ? { email } : {}),
              ...(cpf ? { cpf } : {}),
            })
      const cliente = await pb.collection('clientes').create({
        nome: nome.trim(),
        telefone_principal: phone,
        situacao: 'ativo',
        natureza_cadastral: natureza,
        classificacao_comercial: classificacao,
        pessoa_id: pessoa.id,
        ...(email ? { email } : {}),
        ...(cpf ? { cpf_cnpj: cpf } : {}),
        ...(cnpj ? { cpf_cnpj: cnpj } : {}),
        ...(origem ? { origem_cliente: origem } : {}),
        ...(categoria ? { categoria_indicacao: categoria } : {}),
        ...(referencia ? { referencia_origem: referencia } : {}),
        ...(indicador ? { indicador_pessoa_id: indicador.id } : {}),
        ...(observacoes ? { observacoes } : {}),
      })
      await pb
        .collection('clientes_pessoas')
        .create({ cliente_id: cliente.id, pessoa_id: pessoa.id, papel: 'titular' })
      toast({ title: 'Cliente criado com sucesso!' })
      navigate('/')
    } catch (error) {
      toast({
        title: 'Erro ao criar cliente',
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F
                  id="nome"
                  label={natureza === 'pessoa_juridica' ? 'Nome / Nome Fantasia *' : 'Nome *'}
                  value={nome}
                  onChange={setNome}
                  required
                />
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone principal *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={paisTelefone}
                      onValueChange={(value) => {
                        setPaisTelefone(value)
                        setTelefone(formatPhone(telefone, value))
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
                      value={telefone}
                      onChange={(e) => setTelefone(formatPhone(e.target.value, paisTelefone))}
                      required
                      placeholder={
                        paisTelefone === 'brasil'
                          ? '(XX) XXXXX-XXXX'
                          : '+ código do país e telefone'
                      }
                    />
                    <span className="self-center text-xs text-muted-foreground whitespace-nowrap">
                      {buscandoPessoa ? 'Verificando...' : 'Verificação automática'}
                    </span>
                  </div>
                </div>
              </div>
              {pessoaExistente && (
                <div className="rounded-md border border-[#C69D5F] bg-[#F5EEE7] p-3 text-sm">
                  <strong>Pessoa encontrada:</strong> {pessoaExistente.nome} •{' '}
                  {pessoaExistente.telefone_principal}
                  <div className="mt-2 flex gap-2">
                    <Button type="button" size="sm" onClick={() => setUsarPessoaExistente(true)}>
                      Usar este cadastro
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setUsarPessoaExistente(false)}
                    >
                      Criar novo e revisar depois
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F id="email" label="E-mail" type="email" value={email} onChange={setEmail} />
                {natureza === 'pessoa_fisica' ? (
                  <F id="cpf" label="CPF (opcional)" value={cpf} onChange={setCpf} />
                ) : (
                  <F id="cnpj" label="CNPJ (opcional)" value={cnpj} onChange={setCnpj} />
                )}
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
                  <div className="space-y-2">
                    <Label>Buscar quem indicou (opcional)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={indicadorBusca}
                        onChange={(e) => setIndicadorBusca(e.target.value)}
                        placeholder="Nome ou telefone"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={buscarIndicador}
                        disabled={buscandoIndicador}
                      >
                        {buscandoIndicador ? 'Buscando...' : 'Buscar'}
                      </Button>
                    </div>
                  </div>
                  {indicador && (
                    <p className="text-sm">
                      <strong>Indicador vinculado:</strong> {indicador.nome}
                    </p>
                  )}
                  <F
                    id="referencia"
                    label="Referência livre (opcional)"
                    value={referencia}
                    onChange={setReferencia}
                    placeholder="Ex.: indicação da sogra"
                  />
                  <p className="text-sm text-muted-foreground">
                    Se não existir no sistema, você pode registrar apenas o nome ou a referência
                    livre e complementar depois.
                  </p>
                </div>
              )}
              {classificacao === 'cerimonialista' && (
                <p className="text-sm text-muted-foreground rounded-md bg-[#F5EEE7] p-3">
                  Cerimonialista pode ser PF ou PJ. Os contatos e a equipe serão complementados no
                  mesmo relacionamento.
                </p>
              )}
              {classificacao === 'parceiro_comercial' && (
                <p className="text-sm text-muted-foreground rounded-md bg-[#F5EEE7] p-3">
                  Parceiro pode ser pessoa ou empresa. CPF/CNPJ não é obrigatório para começar.
                </p>
              )}
              <F
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
export default NovoCliente
