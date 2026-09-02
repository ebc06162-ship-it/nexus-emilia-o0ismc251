import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NovoCliente from './pages/NovoCliente'
import NovaOportunidade from './pages/NovaOportunidade'
import Catalogo from './pages/Catalogo'
import Historico from './pages/Historico'
import Usuarios from './pages/Usuarios'
import IntegrationHarness from './pages/IntegrationHarness'
import Layout from './components/Layout'
import pb from '@/lib/pocketbase/client'

// Rota protegida: redireciona para login se não autenticado
const ProtectedRoute = ({ children, roles }) => {
  if (!pb.authStore.isValid) {
    return <Navigate to="/login" replace />
  }
  if (roles && !roles.includes(pb.authStore.record?.papel)) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-8">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-6">
          <h1 className="text-xl font-semibold text-[#3D2314]">Acesso não permitido</h1>
          <p className="mt-2 text-gray-600">
            Seu perfil não tem permissão para consultar esta área.
          </p>
          <button
            className="mt-4 rounded-md bg-[#C69D5F] px-4 py-2 text-white"
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
        {/* Rota pública */}
        <Route path="/login" element={<Login />} />

        {/* Rotas protegidas */}
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
        <Route
          path="/oportunidades/nova"
          element={
            <ProtectedRoute>
              <NovaOportunidade />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
