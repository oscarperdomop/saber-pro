import { Navigate } from 'react-router-dom'
import { getStoredUser } from '../../../hooks/useAuthStore'
import AdminDashboard from './AdminDashboard'

const DashboardPage = () => {
  const user = getStoredUser()

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (user.is_staff) {
    return <AdminDashboard />
  }

  return <Navigate to="/evaluaciones" replace />
}

export default DashboardPage
