import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { getStoredUser, resolveUserRole } from '../../hooks/useAuthStore'

interface HeaderProps {
  onOpenMobileSidebar: () => void
  onToggleSidebarCollapse: () => void
  isSidebarCollapsed: boolean
}

const getInitials = (fullName: string) => {
  const parts = fullName
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return 'US'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

const Header = ({ onOpenMobileSidebar, onToggleSidebarCollapse, isSidebarCollapsed }: HeaderProps) => {
  const user = getStoredUser()
  const role = resolveUserRole(user)
  const fullName = user ? `${user.nombres} ${user.apellidos}`.trim() : 'Invitado'
  const initials = getInitials(fullName)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-usco-ocre/70 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-usco-ocre/70 text-usco-gris transition hover:border-usco-vino/40 hover:text-usco-vino md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onToggleSidebarCollapse}
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-usco-ocre/70 text-usco-gris transition hover:border-usco-vino/40 hover:text-usco-vino md:inline-flex"
          aria-label="Colapsar menu"
        >
          {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-usco-gris/70" />
          <input
            type="text"
            placeholder="Buscar..."
            className="h-10 w-72 rounded-xl border border-usco-ocre/80 bg-usco-fondo/50 pl-10 pr-4 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-usco-ocre/70 text-usco-gris transition hover:border-usco-vino/40 hover:text-usco-vino"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-usco-vino px-1 text-[10px] font-bold text-white">
            0
          </span>
        </button>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-usco-gris/80 sm:text-xs">{role}</p>
          <p className="max-w-[10rem] truncate text-xs font-semibold text-usco-gris sm:max-w-[20rem] sm:text-sm">
            {fullName}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-usco-vino text-xs font-bold text-white sm:h-10 sm:w-10 sm:text-sm">
          {initials}
        </div>
      </div>
    </header>
  )
}

export default Header
