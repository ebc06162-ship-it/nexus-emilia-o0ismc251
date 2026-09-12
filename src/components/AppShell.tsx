import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  History,
  UserCheck,
  Cpu,
  WalletCards,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import EmiliaLogo from './EmiliaLogo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AppShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export const AppShell: React.FC<AppShellProps> = ({ children, title, subtitle }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const user = pb.authStore.record
  const userRole = user?.papel || ''

  const handleLogout = () => {
    pb.authStore.clear()
    navigate('/login')
  }

  const navItems = [
    {
      to: '/',
      label: 'Visão Geral',
      icon: LayoutDashboard,
      roles: ['*'],
    },
    {
      to: '/clientes/novo',
      label: 'Clientes (CRM)',
      icon: Users,
      roles: ['*'],
    },
    {
      to: '/oportunidades/nova',
      label: 'Pedidos & Oportunidades',
      icon: FileText,
      roles: ['*'],
    },
    {
      to: '/catalogo',
      label: 'Catálogo',
      icon: BookOpen,
      roles: ['*'],
    },
    {
      to: '/propostas/nova',
      label: 'Orçamentos',
      icon: FileText,
      roles: ['*'],
    },
    {
      to: '/financeiro/fila',
      label: 'Fila Financeira',
      icon: WalletCards,
      roles: ['administrador', 'gestao', 'financeiro', 'atendimento'],
    },
    {
      to: '/historico',
      label: 'Auditoria & Histórico',
      icon: History,
      roles: ['administrador', 'gestao'],
    },
    {
      to: '/usuarios',
      label: 'Usuários',
      icon: UserCheck,
      roles: ['administrador'],
    },
    {
      to: '/integracoes/homologacao',
      label: 'Integrações',
      icon: Cpu,
      roles: ['administrador'],
    },
  ]

  const visibleNav = navItems.filter((item) => {
    if (item.roles.includes('*')) return true
    return item.roles.includes(userRole)
  })

  // Iniciais para o avatar estilo mock
  const userInitials = (user?.name || user?.email || 'FM')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

  const roleLabel =
    {
      administrador: 'Administradora',
      gestao: 'Gestão',
      atendimento: 'Atendimento',
      financeiro: 'Financeiro',
      producao: 'Produção',
      cliente_externo: 'Cliente',
    }[userRole] || 'Usuária'

  return (
    <div className="min-h-screen bg-[#F7F1E8] text-[#5C4A32] flex flex-col font-sans">
      {/* Topbar unificada */}
      <header className="sticky top-0 z-30 bg-[#FBF7F0]/95 backdrop-blur-md border-b border-[#E8DEC8] px-3 sm:px-4 md:px-6 py-3 transition-all">
        <div className="w-full mx-auto flex items-center justify-between gap-4">
          {/* Logo & tag da marca */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded-lg text-[#5C4A32] hover:bg-[#F2E8D8] transition-colors"
              aria-label="Abrir menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <NavLink to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <EmiliaLogo size="md" />
            </NavLink>

            <div className="hidden lg:flex items-center border-l border-[#E8DEC8] pl-5">
              <span
                className="font-brand-accent text-[40px] leading-none select-none tracking-normal whitespace-nowrap"
                style={{ color: '#B08A3E' }}
                title="Tradição que celebra histórias"
              >
                Tradição que celebra histórias
              </span>
            </div>
          </div>

          {/* Campo de busca arredondado da referência */}
          <div className="hidden md:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7A66]/70 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Buscar clientes, pedidos, produtos, relatórios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-full bg-[#FDFAF5] border border-[#E8DEC8] text-[#5C4A32] placeholder:text-[#8A7A66]/60 focus:outline-none focus:ring-2 focus:ring-[#B08A3E]/30 focus:border-[#B08A3E] transition-all"
              />
            </div>
          </div>

          {/* Notificações & Perfil */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative p-2 rounded-full text-[#5C4A32] hover:bg-[#F2E8D8] transition-colors"
              title="Notificações"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#B08A3E] text-white text-[11px] flex items-center justify-center font-data tabular-nums font-semibold">
                3
              </span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#F2E8D8] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#E8DEC8] text-[#5C4A32] flex items-center justify-center font-sans text-sm font-bold border border-[#D6BC7E]">
                    {userInitials}
                  </div>
                  <div className="hidden sm:flex flex-col pr-1">
                    <span className="text-sm font-semibold text-[#5C4A32] leading-tight">
                      {user?.name || 'Fernanda Mathias'}
                    </span>
                    <span className="text-xs text-[#8A7A66] leading-tight">{roleLabel}</span>
                  </div>
                  <ChevronDown size={15} className="text-[#8A7A66] hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 bg-[#FDFAF5] border-[#E8DEC8]">
                <DropdownMenuLabel className="font-serif text-base text-[#5C4A32]">
                  Minha Conta
                </DropdownMenuLabel>
                <div className="px-2 py-1 text-xs md:text-sm text-[#8A7A66]">
                  {user?.email || 'usuario@emilia.com.br'}
                </div>
                <DropdownMenuSeparator className="bg-[#E8DEC8]" />
                <DropdownMenuItem
                  onClick={() => navigate('/')}
                  className="text-sm text-[#5C4A32] cursor-pointer hover:bg-[#F5EFE6]"
                >
                  <LayoutDashboard size={16} className="mr-2 text-[#B08A3E]" />
                  Visão Geral
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/catalogo')}
                  className="text-sm text-[#5C4A32] cursor-pointer hover:bg-[#F5EFE6]"
                >
                  <BookOpen size={16} className="mr-2 text-[#B08A3E]" />
                  Catálogo
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#E8DEC8]" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-sm text-red-700 cursor-pointer hover:bg-red-50"
                >
                  <LogOut size={16} className="mr-2" />
                  Sair do sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Container Principal: Sidebar + Conteúdo */}
      <div className="flex-1 flex w-full mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 gap-5">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#FBF7F0] border border-[#E8DEC8] rounded-2xl p-3.5 shadow-subtle justify-between">
          <div className="space-y-1.5">
            <div className="px-3 py-2 mb-1">
              <span className="text-xs tracking-[0.18em] uppercase font-sans text-[#8A7A66] font-semibold">
                Navegação
              </span>
            </div>
            {visibleNav.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#EFE5D3] text-[#5C4A32] font-semibold shadow-xs border border-[#E2D5BE]'
                        : 'text-[#7D7060] hover:text-[#5C4A32] hover:bg-[#F4EEDA]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={19} className={isActive ? 'text-[#B08A3E]' : 'text-[#8A7A66]'} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>

          {/* Bloco decorativo do rodapé da sidebar (fiel ao mockup: "MOMENTOS QUE ADOÇAM HISTÓRIAS") */}
          <div className="pt-6 border-t border-[#E8DEC8]/60 px-3 pb-2 flex flex-col items-center text-center">
            <EmiliaLogo size="sm" className="items-center" />
            <p className="text-[11px] tracking-[0.22em] uppercase font-sans text-[#8A7A66] font-medium mt-1.5">
              MOMENTOS QUE ADOÇAM HISTÓRIAS
            </p>
          </div>
        </aside>

        {/* Sidebar mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden flex">
            <div className="w-64 bg-[#FBF7F0] p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8DEC8]">
                  <EmiliaLogo size="sm" />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1 rounded-lg text-[#5C4A32]"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-1 pt-2">
                  {visibleNav.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-[#EFE5D3] text-[#5C4A32] font-semibold border border-[#E2D5BE]'
                              : 'text-[#7D7060] hover:text-[#5C4A32] hover:bg-[#F4EEDA]'
                          }`
                        }
                      >
                        <Icon size={19} className="text-[#B08A3E]" />
                        <span>{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8DEC8]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-red-700 bg-red-50 rounded-xl font-medium"
                >
                  <LogOut size={16} />
                  Sair do sistema
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        {/* Área central com título opcional e conteúdo da rota */}
        <main className="flex-1 min-w-0 space-y-6">
          {(title || subtitle) && (
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-[#E8DEC8]/60">
              <div>
                {title && (
                  <h1 className="font-serif text-3xl md:text-4xl font-semibold text-[#5C4A32] tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && <p className="text-sm md:text-base text-[#8A7A66] mt-1">{subtitle}</p>}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Rodapé institucional discreto (estilo mockup) */}
      <footer className="mt-auto border-t border-[#E8DEC8] bg-[#FBF7F0]/60 py-3.5 px-4 text-center">
        <div className="w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs md:text-sm text-[#8A7A66]">
          <span>Emília Bem-Casados · ERP integrado para um negócio mais doce.</span>
          <span className="font-serif italic text-title-min md:text-xl text-[#B08A3E]">
            "Mais que bem-casados, entregamos celebrações."
          </span>
          <span>Versão 1.0.0</span>
        </div>
      </footer>
    </div>
  )
}

export default AppShell
