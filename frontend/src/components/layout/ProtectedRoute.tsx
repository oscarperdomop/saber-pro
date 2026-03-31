import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { User } from '../../types/auth'
import { resolveDefaultRoute, resolveUserRole } from '../../hooks/useAuthStore'

const ACTIVAR_CUENTA_PATH = '/activar-cuenta'

const parseStoredUser = (value: string | null): User | null => {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as User
  } catch {
    return null
  }
}

const ProtectedRoute = () => {
  const location = useLocation()
  const token = localStorage.getItem('token')
  const user = parseStoredUser(localStorage.getItem('user'))
  const userRole = resolveUserRole(user)
  const dashboardPath = resolveDefaultRoute(userRole)
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/'
  const isActivationRoute = normalizedPath === ACTIVAR_CUENTA_PATH
  const isFirstLogin = Boolean(user?.es_primer_ingreso)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (isFirstLogin && !isActivationRoute) {
    return <Navigate to={ACTIVAR_CUENTA_PATH} replace />
  }

  if (!isFirstLogin && isActivationRoute) {
    return <Navigate to={dashboardPath} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
