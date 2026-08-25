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
  })
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.segmento || !formData.tipo_pedido) {
        toast({ title: 'Segmento e tipo de evento são obrigatórios', variant: 'destructive' })
        setLoading(false)
        return
      }
      const dataToSend = {
        ...formData,
        responsavel_atual: pb.authStore.record.id,
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
                  <Label htmlFor="segmento">Segmento *</Label>
                  <Select onValueChange={(v) => handleChange('segmento', v)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casamento_noiva">Casamento / Noiva</SelectItem>
                      <SelectItem value="eventos_sociais">Eventos sociais</SelectItem>
                      <SelectItem value="maternidade">Maternidade</SelectItem>
                      <SelectItem value="corporativo">Corporativo</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_pedido">Tipo de Evento *</Label>
                  <Select onValueChange={(v) => handleChange('tipo_pedido', v)} required>
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
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.segmento === 'casamento_noiva' && (
                <div className="space-y-2">
                  <Label>Nome dos Noivos</Label>
                  <Input
                    value={formData.nome_noivos}
                    onChange={(e) => handleChange('nome_noivos', e.target.value)}
                  />
                </div>
              )}
              {formData.segmento === 'eventos_sociais' && (
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
              {formData.segmento === 'maternidade' && (
                <div className="space-y-2">
                  <Label>Nome do Bebê</Label>
                  <Input
                    value={formData.nome_bebe}
                    onChange={(e) => handleChange('nome_bebe', e.target.value)}
                  />
                </div>
              )}
              {formData.segmento === 'outros' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Evento</Label>
                    <Input
                      value={formData.tipo_outro}
                      onChange={(e) => handleChange('tipo_outro', e.target.value)}
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
                  {loading ? 'Salvando...' : 'Salvar Oportunidade'}
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
