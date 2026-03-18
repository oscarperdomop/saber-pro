import { Navigate } from 'react-router-dom'
import { getStoredUser, resolveUserRole } from '../../../hooks/useAuthStore'
import DashboardEstudiantePage from '../../estudiante/pages/DashboardEstudiantePage'
import AdminDashboard from './AdminDashboard'

const DashboardPage = () => {
  const user = getStoredUser()

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (resolveUserRole(user) === 'ADMIN') {
    return <AdminDashboard />
  }

  return <DashboardEstudiantePage />
}

export default DashboardPage
