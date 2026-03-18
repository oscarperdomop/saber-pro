import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '../../types/auth'
import { getStoredToken, getStoredUser, resolveDefaultRoute, resolveUserRole } from '../../hooks/useAuthStore'

interface RoleRouteProps {
  allowedRoles: UserRole[]
}

const RoleRoute = ({ allowedRoles }: RoleRouteProps) => {
  const token = getStoredToken()
  const user = getStoredUser()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  const userRole = resolveUserRole(user)

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={resolveDefaultRoute(userRole)} replace />
  }

  return <Outlet />
}

export default RoleRoute
