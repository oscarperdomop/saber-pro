import { BookOpen, Database, FileText, LayoutDashboard, LogOut, Settings2, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuthStore'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/evaluaciones', label: 'Evaluaciones', icon: BookOpen },
  { to: '/preguntas', label: 'Banco de Preguntas', icon: Database, adminOnly: true },
  { to: '/modulos/especificaciones', label: 'Especificaciones', icon: Settings2, adminOnly: true },
  { to: '/simulacros', label: 'Simulacros', icon: FileText, adminOnly: true },
  { to: '/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
]

const Sidebar = () => {
  const { logout, user } = useAuthStore()
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.is_staff === true)

  return (
    <aside className="border-b border-usco-ocre/70 bg-white md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r">
      <div className="border-b border-usco-ocre/70 px-4 py-4 md:px-6 md:py-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-usco-gris md:text-xs">Saber Pro</p>
        <h1 className="mt-1 text-3xl font-bold leading-none text-usco-vino md:mt-2">USCO</h1>
      </div>

      <nav className="flex gap-2 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:space-y-2 md:overflow-visible md:py-6">
        {visibleNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition md:gap-3 md:px-4 md:py-3 ${
                isActive
                  ? 'bg-usco-vino/10 text-usco-vino'
                  : 'text-usco-gris hover:bg-usco-fondo hover:text-usco-vino'
              }`
            }
          >
            <Icon className="h-4 w-4 md:h-5 md:w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3 md:hidden">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-usco-ocre/90 px-4 py-2.5 text-sm font-semibold text-usco-gris transition hover:border-usco-vino/30 hover:bg-usco-vino/5 hover:text-usco-vino"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesion
        </button>
      </div>

      <div className="hidden border-t border-usco-ocre/70 p-3 md:block">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-usco-gris transition hover:bg-red-50 hover:text-usco-vino"
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesion
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
