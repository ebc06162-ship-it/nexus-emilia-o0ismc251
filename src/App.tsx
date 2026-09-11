import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NovoCliente from './pages/NovoCliente'
import NovaOportunidade from './pages/NovaOportunidade'
import NovaProposta from './pages/NovaProposta'
import Catalogo from './pages/Catalogo'
import Historico from './pages/Historico'
import Usuarios from './pages/Usuarios'
import IntegrationHarness from './pages/IntegrationHarness'
import pb from '@/lib/pocketbase/client'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  if (!pb.authStore.isValid) return <Navigate to="/login" replace />
  if (roles && !roles.includes(pb.authStore.record?.papel)) {
    return (
      <div className="min-h-screen bg-[#F7F1E8] flex items-center justify-center p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-[#E8DEC8] bg-[#FDFAF5] p-6 text-center shadow-card">
          <h1 className="font-serif text-xl font-semibold text-[#5C4A32]">Acesso não permitido</h1>
          <p className="mt-2 text-xs text-[#8A7A66]">
            Seu perfil não tem permissão para consultar esta área.
          </p>
          <button
            className="mt-4 rounded-xl bg-[#5C4A32] hover:bg-[#473926] px-5 py-2.5 text-xs text-[#FDFAF5] font-medium transition-colors"
            onClick={() => window.location.assign('/')}
          >
            Voltar ao início
          </button>
        </div>
      </div>
    )
  }
  return children
}

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes/novo"
          element={
            <ProtectedRoute>
              <NovoCliente />
            </ProtectedRoute>
          }
        />
        <Route
          path="/oportunidades/nova"
          element={
            <ProtectedRoute>
              <NovaOportunidade />
            </ProtectedRoute>
          }
        />
        <Route
          path="/propostas/nova"
          element={
            <ProtectedRoute>
              <NovaProposta />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalogo"
          element={
            <ProtectedRoute>
              <Catalogo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/historico"
          element={
            <ProtectedRoute roles={['administrador', 'gestao']}>
              <Historico />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute roles={['administrador']}>
              <Usuarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/integracoes/homologacao"
          element={
            <ProtectedRoute roles={['administrador']}>
              <IntegrationHarness />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
