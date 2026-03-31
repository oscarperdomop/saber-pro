import {
  BookCheck,
  ChevronRight,
  Database,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogOut,
  Settings2,
  UserCircle2,
  Users,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { hasAdminAccess, resolveUserRole, useAuthStore } from '../../hooks/useAuthStore'
import type { UserRole } from '../../types/auth'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: UserRole[]
  requiresStaffForProfessor?: boolean
  hideForStaffProfessor?: boolean
}

interface SidebarProps {
  isSidebarOpen: boolean
  isSidebarCollapsed: boolean
  onCloseMobileSidebar: () => void
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'PROFESOR'],
    requiresStaffForProfessor: true,
  },
  {
    to: '/perfil',
    label: 'Mi Perfil',
    icon: UserCircle2,
    roles: ['ADMIN', 'PROFESOR'],
    requiresStaffForProfessor: true,
  },
  { to: '/usuarios', label: 'Usuarios', icon: Users, roles: ['ADMIN'] },
  {
    to: '/preguntas',
    label: 'Banco de Preguntas',
    icon: Database,
    roles: ['ADMIN', 'PROFESOR'],
    requiresStaffForProfessor: true,
  },
  {
    to: '/simulacros',
    label: 'Simulacros',
    icon: FileText,
    roles: ['ADMIN', 'PROFESOR'],
    requiresStaffForProfessor: true,
  },
  {
    to: '/modulos/especificaciones',
    label: 'Especificaciones',
    icon: Settings2,
    roles: ['ADMIN', 'PROFESOR'],
    requiresStaffForProfessor: true,
  },
  {
    to: '/estudiante/dashboard',
    label: 'Inicio',
    icon: LayoutDashboard,
    roles: ['ESTUDIANTE', 'PROFESOR'],
    hideForStaffProfessor: true,
  },
  {
    to: '/evaluaciones',
    label: 'Mis Examenes',
    icon: BookCheck,
    roles: ['ESTUDIANTE', 'PROFESOR'],
    hideForStaffProfessor: true,
  },
  {
    to: '/perfil',
    label: 'Mi Perfil',
    icon: UserCircle2,
    roles: ['ESTUDIANTE', 'PROFESOR'],
    hideForStaffProfessor: true,
  },
]

const Sidebar = ({ isSidebarOpen, isSidebarCollapsed, onCloseMobileSidebar }: SidebarProps) => {
  const { logout, user } = useAuthStore()
  const role = resolveUserRole(user)
  const dashboardPath = hasAdminAccess(user) ? '/dashboard' : '/estudiante/dashboard'
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles.includes(role)) {
      return false
    }

    if (role === 'PROFESOR' && item.requiresStaffForProfessor && !user?.is_staff) {
      return false
    }

    if (role === 'PROFESOR' && item.hideForStaffProfessor && user?.is_staff) {
      return false
    }

    return true
  })

  return (
    <>
      {isSidebarOpen && (
        <button
          type="button"
          onClick={onCloseMobileSidebar}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Cerrar menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-usco-ocre/70 bg-white shadow-xl transition-all duration-300 md:sticky md:top-0 md:z-10 md:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'w-20' : 'w-72 md:w-64'}`}
      >
        <div className="flex h-16 items-center border-b border-usco-ocre/70 px-4 md:px-5">
          <Link
            to={dashboardPath}
            onClick={() => {
              if (window.innerWidth < 768) {
                onCloseMobileSidebar()
              }
            }}
            className={`flex items-center gap-2.5 rounded-lg transition hover:opacity-90 ${
              isSidebarCollapsed ? 'mx-auto' : ''
            }`}
            aria-label="Ir al inicio"
            title="Ir al dashboard"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-usco-vino text-white">
              <GraduationCap className="h-[18px] w-[18px]" />
            </div>
            {!isSidebarCollapsed && (
              <div className="leading-none">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-usco-gris">Saber Pro</p>
                <h1 className="mt-0.5 text-[26px] font-bold text-usco-vino">USCO</h1>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => {
                if (window.innerWidth < 768) {
                  onCloseMobileSidebar()
                }
              }}
              className={({ isActive }) =>
                `group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-usco-vino/10 text-usco-vino'
                    : 'text-usco-gris hover:bg-usco-fondo hover:text-usco-vino'
                } ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3'}`
              }
              title={isSidebarCollapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">{label}</span>}
                  {!isSidebarCollapsed && isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-usco-ocre/70 p-3">
          <button
            type="button"
            onClick={logout}
            className={`flex w-full items-center rounded-xl px-3 py-3 text-sm font-semibold text-usco-gris transition hover:bg-red-50 hover:text-usco-vino ${
              isSidebarCollapsed ? 'justify-center px-0' : 'gap-3'
            }`}
            title={isSidebarCollapsed ? 'Cerrar Sesion' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isSidebarCollapsed && <span>Cerrar Sesion</span>}
          </button>

          {!isSidebarCollapsed && (
            <p className="mt-2 flex items-center gap-1.5 px-2 text-[10px] uppercase tracking-[0.18em] text-usco-gris/70">
              <Lock className="h-3 w-3" />
              Area segura
            </p>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
