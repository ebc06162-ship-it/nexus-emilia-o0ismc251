import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import pb from '@/lib/pocketbase/client'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'

const TYPES = [
  ['cliente_direto', 'Cliente Direto'],
  ['cerimonialista', 'Cerimonialista'],
  ['corporativo', 'Corporativo'],
  ['revenda', 'Revenda'],
  ['parceiro', 'Parceiro'],
]
const ORIGINS = [['whatsapp','WhatsApp'],['telefone','Telefone'],['email','Email'],['presencial','Presencial'],['indicacao','Indicação'],['instagram','Instagram'],['site','Site'],['outro','Outro']]
const formatPhone = (value) => {
  const d = value.replace(/\D/g, '').replace(/^55/, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}
const F = ({ id, label, value, onChange, type='text', required=false, placeholder='' }) => <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} /></div>

const NovoCliente = () => {
  const [tipoCliente, setTipoCliente] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [telefoneSecundario, setTelefoneSecundario] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [origem, setOrigem] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [contatos, setContatos] = useState([{ nome: '', telefone: '' }])
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const isPessoaFisica = tipoCliente === 'cliente_direto' || tipoCliente === 'cerimonialista' || tipoCliente === 'parceiro'
  const isPessoaJuridica = tipoCliente === 'corporativo' || tipoCliente === 'cerimonialista' || tipoCliente === 'revenda' || tipoCliente === 'parceiro'

  const updateContato = (index, field, value) => setContatos((items) => items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  const addContato = () => setContatos((items) => [...items, { nome: '', telefone: '' }])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pb.authStore.isValid || !pb.authStore.record?.id) { window.location.assign('/login'); return }
    if (!tipoCliente || !nome.trim() || !telefone.trim()) { toast({ title: 'Tipo, nome e telefone principal são obrigatórios', variant: 'destructive' }); return }
    if (tipoCliente === 'cliente_direto' && !cpf.trim()) { toast({ title: 'CPF obrigatório para Cliente Direto', variant: 'destructive' }); return }
    if (tipoCliente === 'corporativo' && !cnpj.trim()) { toast({ title: 'CNPJ obrigatório para Corporativo', variant: 'destructive' }); return }
    if ((tipoCliente === 'cerimonialista' || tipoCliente === 'revenda' || tipoCliente === 'parceiro') && !empresa.trim()) { toast({ title: 'Empresa ou grupo obrigatório', variant: 'destructive' }); return }
    if (tipoCliente === 'cerimonialista' && contatos.some((c) => !c.nome.trim() || !c.telefone.trim())) { toast({ title: 'Preencha todos os contatos da cerimonialista', variant: 'destructive' }); return }
    setLoading(true)
    try {
      const data = { nome: nome.trim(), telefone_principal: telefone.replace(/\D/g, ''), tipo_cliente: tipoCliente }
      if (telefoneSecundario) data.telefone_secundario = telefoneSecundario.replace(/\D/g, '')
      if (email) data.email = email
      if (cpf) data.cpf_cnpj = cpf
      if (cnpj) data.cpf_cnpj = cnpj
      if (origem) data.origem_contato = origem
      if (observacoes) data.observacoes = observacoes
      const cliente = await pb.collection('clientes').create(data)
      if (tipoCliente === 'cerimonialista') {
        const cerimonialista = await pb.collection('cerimonialistas').create({ nome_empresa: empresa })
        for (const contato of contatos.filter((c) => c.nome.trim() && c.telefone.trim())) {
          await pb.collection('contatos_cerimonialistas').create({ cerimonialista_id: cerimonialista.id, nome: contato.nome.trim(), telefone: contato.telefone.replace(/\D/g, '') })
        }
      }
      toast({ title: 'Cliente criado com sucesso!' })
      navigate('/')
    } catch (error) { toast({ title: 'Erro ao criar cliente', description: error?.response?.data?.message || error?.message || 'Tente novamente', variant: 'destructive' }) }
    finally { setLoading(false) }
  }

  const showContacts = tipoCliente === 'cerimonialista' || tipoCliente === 'parceiro' || tipoCliente === 'corporativo'
  return <div className="min-h-screen bg-[#FAF8F5]"><header className="bg-[#3D2314] text-white p-4"><div className="container mx-auto"><h1 className="text-xl font-bold">Novo Cliente</h1></div></header><main className="container mx-auto py-8 px-4"><Card className="max-w-2xl mx-auto"><CardHeader><CardTitle>Cadastro de Cliente</CardTitle></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-4">
    <div className="space-y-2"><Label>Tipo de Cliente *</Label><Select value={tipoCliente} onValueChange={setTipoCliente}><SelectTrigger><SelectValue placeholder="Selecione o tipo de cadastro" /></SelectTrigger><SelectContent>{TYPES.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><F id="nome" label="Nome *" value={nome} onChange={setNome} required /><F id="telefone" label="Telefone Principal *" value={telefone} onChange={(v) => setTelefone(formatPhone(v))} required placeholder="(XX) XXXXX-XXXX" /></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><F id="telefone_secundario" label="Telefone Secundário" value={telefoneSecundario} onChange={(v) => setTelefoneSecundario(formatPhone(v))} placeholder="(XX) XXXXX-XXXX" /><F id="email" label="Email" type="email" value={email} onChange={setEmail} /></div>
    {tipoCliente === 'cliente_direto' && <F id="cpf" label="CPF *" value={cpf} onChange={setCpf} required />}
    {tipoCliente === 'corporativo' && <F id="cnpj" label="CNPJ *" value={cnpj} onChange={setCnpj} required />}
    {(tipoCliente === 'cerimonialista' || tipoCliente === 'revenda' || tipoCliente === 'parceiro') && <F id="empresa" label={tipoCliente === 'revenda' ? 'Nome da Revenda, Buffet ou Loja *' : 'Nome da Empresa ou Grupo *'} value={empresa} onChange={setEmpresa} required />}
    {showContacts && <div className="space-y-3 rounded-md border p-4"><div className="flex justify-between items-center"><Label>Contatos{tipoCliente === 'cerimonialista' ? ' *' : ''}</Label><Button type="button" variant="outline" onClick={addContato}>+ Adicionar contato</Button></div>{contatos.map((c,i) => <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3"><F id={`contato_nome_${i}`} label={`Nome do contato ${i+1}${tipoCliente === 'cerimonialista' ? ' *' : ''}`} value={c.nome} onChange={(v) => updateContato(i,'nome',v)} required={tipoCliente === 'cerimonialista'} /><F id={`contato_telefone_${i}`} label={`Telefone do contato ${i+1}${tipoCliente === 'cerimonialista' ? ' *' : ''}`} value={c.telefone} onChange={(v) => updateContato(i,'telefone',formatPhone(v))} required={tipoCliente === 'cerimonialista'} placeholder="(XX) XXXXX-XXXX" /></div>)}</div>}
    {tipoCliente === 'parceiro' && <p className="text-sm text-muted-foreground rounded-md bg-[#F5EEE7] p-3">CPF é opcional para Parceiro. O cadastro pode ser uma empresa ou uma pessoa que indica clientes.</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{tipoCliente !== 'corporativo' && tipoCliente !== 'cliente_direto' && <F id="cpf_opcional" label="CPF (opcional)" value={cpf} onChange={setCpf} />}<div className="space-y-2"><Label>Origem do Contato</Label><Select value={origem} onValueChange={setOrigem}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{ORIGINS.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></div></div>
    <F id="observacoes" label="Observações" value={observacoes} onChange={setObservacoes} /><div className="flex gap-4"><Button type="submit" className="bg-[#C69D5F] hover:bg-[#DCC39E] text-white" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Cliente'}</Button><Button type="button" variant="outline" onClick={() => navigate('/')}>Cancelar</Button></div>
  </form></CardContent></Card></main><Toaster /></div>
}
export default NovoCliente
