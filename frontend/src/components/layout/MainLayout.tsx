import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-usco-fondo md:flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 bg-usco-fondo px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
