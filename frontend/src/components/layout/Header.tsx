import { getStoredUser } from '../../hooks/useAuthStore'

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

const Header = () => {
  const user = getStoredUser()
  const fullName = user ? `${user.nombres} ${user.apellidos}`.trim() : 'Invitado'
  const initials = getInitials(fullName)

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-end border-b border-usco-ocre/70 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-usco-gris/80 sm:text-xs">Usuario</p>
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
