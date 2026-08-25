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
import { pb } from '@/lib/pocketbase/client'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'

const NovoCliente = () => {
  const [formData, setFormData] = useState({
    nome: '',
    telefone_principal: '',
    telefone_secundario: '',
    email: '',
    tipo_cliente: '',
    cpf_cnpj: '',
    origem_contato: '',
    nome_noivos: '',
    observacoes: '',
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Filtrar campos vazios
      const dataToSend = Object.fromEntries(Object.entries(formData).filter(([_, v]) => v !== ''))

      await pb.collection('clientes').create(dataToSend)
      toast({
        title: 'Cliente criado com sucesso!',
        description: 'O registro foi salvo no sistema',
      })
      navigate('/')
    } catch (error) {
      toast({
        title: 'Erro ao criar cliente',
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
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone_principal">Telefone Principal</Label>
                  <Input
                    id="telefone_principal"
                    value={formData.telefone_principal}
                    onChange={(e) => handleChange('telefone_principal', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_cliente">Tipo de Cliente</Label>
                  <Select onValueChange={(v) => handleChange('tipo_cliente', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="noiva">Noiva</SelectItem>
                      <SelectItem value="cerimonialista">Cerimonialista</SelectItem>
                      <SelectItem value="corporativo">Corporativo</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpf_cnpj"
                    value={formData.cpf_cnpj}
                    onChange={(e) => handleChange('cpf_cnpj', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origem_contato">Origem do Contato</Label>
                  <Select onValueChange={(v) => handleChange('origem_contato', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="indicacao">Indicação</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="site">Site</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_noivos">Nome dos Noivos</Label>
                <Input
                  id="nome_noivos"
                  value={formData.nome_noivos}
                  onChange={(e) => handleChange('nome_noivos', e.target.value)}
                />
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
