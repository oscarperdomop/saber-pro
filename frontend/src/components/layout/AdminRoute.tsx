import RoleRoute from './RoleRoute'

const AdminRoute = () => {
  return <RoleRoute allowedRoles={['ADMIN']} />
}

export default AdminRoute
