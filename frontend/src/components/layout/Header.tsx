import { useEffect, useRef, useState } from 'react'
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { getStoredUser, resolveUserRole } from '../../hooks/useAuthStore'
import { useNotifications } from '../../context/NotificationsContext'

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
  const { notificationCount, notifications, markAllAsRead, refreshNotifications } = useNotifications()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationPanelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isNotificationsOpen) {
      return undefined
    }

    const onClickOutside = (event: MouseEvent) => {
      if (!notificationPanelRef.current) {
        return
      }

      const target = event.target as Node
      if (!notificationPanelRef.current.contains(target)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [isNotificationsOpen])

  const handleToggleNotifications = () => {
    const nextOpen = !isNotificationsOpen
    setIsNotificationsOpen(nextOpen)
    if (nextOpen) {
      void refreshNotifications()
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    await refreshNotifications()
  }

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
        <div className="relative" ref={notificationPanelRef}>
          <button
            type="button"
            onClick={handleToggleNotifications}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-usco-ocre/70 text-usco-gris transition hover:border-usco-vino/40 hover:text-usco-vino"
            aria-label="Notificaciones"
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-usco-vino px-1 text-[10px] font-bold text-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            ) : null}
          </button>

          {isNotificationsOpen ? (
            <div className="absolute right-0 mt-2 w-[20rem] max-w-[85vw] overflow-hidden rounded-xl border border-usco-ocre/70 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-usco-ocre/60 px-3 py-2">
                <p className="text-sm font-semibold text-usco-vino">Notificaciones</p>
                <button
                  type="button"
                  onClick={() => void handleMarkAllAsRead()}
                  className="text-xs font-semibold text-usco-gris transition hover:text-usco-vino"
                >
                  Marcar todas
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`border-b border-usco-ocre/40 px-3 py-2 last:border-b-0 ${
                        notification.leida ? 'bg-white' : 'bg-usco-fondo/70'
                      }`}
                    >
                      <p className="text-sm text-usco-gris">{notification.mensaje}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-usco-gris/70">
                        {new Date(notification.created_at).toLocaleString('es-CO')}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="px-3 py-6 text-center text-sm text-usco-gris/80">
                    No tienes notificaciones nuevas.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

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
