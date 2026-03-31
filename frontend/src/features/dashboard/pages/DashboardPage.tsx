import { Navigate } from 'react-router-dom'
import { getStoredUser, hasAdminAccess } from '../../../hooks/useAuthStore'
import DashboardEstudiantePage from '../../estudiante/pages/DashboardEstudiantePage'
import AdminDashboard from './AdminDashboard'

const DashboardPage = () => {
  const user = getStoredUser()

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (hasAdminAccess(user)) {
    return <AdminDashboard />
  }

  return <DashboardEstudiantePage />
}

export default DashboardPage
