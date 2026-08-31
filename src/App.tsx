import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NovoCliente from './pages/NovoCliente'
import NovaOportunidade from './pages/NovaOportunidade'
import Catalogo from './pages/Catalogo'
import Layout from './components/Layout'
import pb from '@/lib/pocketbase/client'

// Rota protegida: redireciona para login se não autenticado
const ProtectedRoute = ({ children }) => {
  if (!pb.authStore.isValid) {
    return <Navigate to="/login" replace />
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
