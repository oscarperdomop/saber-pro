import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '../../types/auth'
import { getStoredToken, getStoredUser, resolveDefaultRoute, resolveUserRole } from '../../hooks/useAuthStore'

interface RoleRouteProps {
  allowedRoles: UserRole[]
  requireStaffForRoles?: UserRole[]
  denyStaffForRoles?: UserRole[]
}

const RoleRoute = ({
  allowedRoles,
  requireStaffForRoles = [],
  denyStaffForRoles = [],
}: RoleRouteProps) => {
  const token = getStoredToken()
  const user = getStoredUser()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  const userRole = resolveUserRole(user)

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={resolveDefaultRoute(userRole, user)} replace />
  }

  if (requireStaffForRoles.includes(userRole) && !user.is_staff) {
    return <Navigate to={resolveDefaultRoute(userRole, user)} replace />
  }

  if (denyStaffForRoles.includes(userRole) && user.is_staff) {
    return <Navigate to={resolveDefaultRoute(userRole, user)} replace />
  }

  return <Outlet />
}

export default RoleRoute
