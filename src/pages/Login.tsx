import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import EmiliaLogo from '@/components/EmiliaLogo'
import { Lock, Mail, Sparkles } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await pb.collection('users').authWithPassword(email, password)
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vinda ao Nexus Emília',
      })
      window.location.assign('/')
    } catch {
      toast({
        title: 'Erro no login',
        description: 'Email ou senha incorretos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F1E8] px-4 py-12 relative overflow-hidden">
      {/* Detalhes de fundo suaves em tom bege e dourado */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#EFE5D3]/60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#E5D7B7]/40 blur-3xl pointer-events-none" />

      {/* Card central */}
      <Card className="w-full max-w-md bg-[#FDFAF5] border-[#E8DEC8] rounded-3xl shadow-elevation relative z-10 overflow-hidden">
        {/* Topo com logotipo oficial Emília Bem-Casados */}
        <CardHeader className="text-center pt-8 pb-4 flex flex-col items-center">
          <EmiliaLogo size="lg" className="mb-2" />
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="h-[1px] w-8 bg-[#E8DEC8]" />
            <span className="text-xs tracking-[0.24em] uppercase font-sans text-[#8A7A66] font-semibold">
              SISTEMA DE GESTÃO
            </span>
            <span className="h-[1px] w-8 bg-[#E8DEC8]" />
          </div>
          <p className="font-serif italic text-title-min md:text-xl text-[#B08A3E] mt-2">
            "Tradição que celebra histórias."
          </p>
        </CardHeader>

        <CardContent className="px-6 md:px-8 pb-8 pt-2">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[15px] font-semibold text-[#5C4A32]">
                E-mail de acesso
              </Label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7A66]/70 pointer-events-none"
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@emilia.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 rounded-xl bg-white/80 border-[#E8DEC8] text-[#5C4A32] focus:border-[#B08A3E] focus:ring-[#B08A3E]/30 text-[15px] h-10 py-2"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[15px] font-semibold text-[#5C4A32]">
                Senha
              </Label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7A66]/70 pointer-events-none"
                />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 rounded-xl bg-white/80 border-[#E8DEC8] text-[#5C4A32] focus:border-[#B08A3E] focus:ring-[#B08A3E]/30 text-[15px] h-10 py-2"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#5C4A32] hover:bg-[#473926] text-[#FDFAF5] rounded-xl py-2.5 font-medium text-[15px] shadow-xs transition-colors mt-2"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar no sistema'}
            </Button>
          </form>

          {/* Dica de rodapé */}
          <div className="mt-6 pt-4 border-t border-[#E8DEC8]/60 text-center">
            <p className="text-xs text-[#8A7A66] flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-[#B08A3E]" />
              Emília Bem-Casados · Acesso restrito
            </p>
          </div>
        </CardContent>
      </Card>

      <Toaster />
    </div>
  )
}

export default Login
