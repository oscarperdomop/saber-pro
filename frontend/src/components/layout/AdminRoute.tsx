import { Navigate, Outlet } from 'react-router-dom'
import { getStoredUser } from '../../hooks/useAuthStore'

const AdminRoute = () => {
  const user = getStoredUser()

  if (!user?.is_staff) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default AdminRoute
