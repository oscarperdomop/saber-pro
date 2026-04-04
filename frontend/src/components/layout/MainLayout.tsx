import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    const isMobile = window.innerWidth < 768
    if (!isMobile) {
      return
    }

    if (isSidebarOpen) {
      const scrollY = window.scrollY
      document.body.dataset.sidebarScrollY = String(scrollY)
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.width = '100%'
    } else {
      const storedScrollY = Number(document.body.dataset.sidebarScrollY ?? '0')
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = ''
      delete document.body.dataset.sidebarScrollY
      if (!Number.isNaN(storedScrollY)) {
        window.scrollTo(0, storedScrollY)
      }
    }

    return () => {
      const storedScrollY = Number(document.body.dataset.sidebarScrollY ?? '0')
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = ''
      delete document.body.dataset.sidebarScrollY
      if (!Number.isNaN(storedScrollY) && storedScrollY > 0) {
        window.scrollTo(0, storedScrollY)
      }
    }
  }, [isSidebarOpen])

  return (
    <div className="min-h-[100dvh] bg-usco-fondo md:flex md:min-h-screen">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        onCloseMobileSidebar={() => setIsSidebarOpen(false)}
      />

      <div className="flex min-h-[100dvh] flex-1 flex-col md:min-h-screen">
        <Header
          onOpenMobileSidebar={() => setIsSidebarOpen(true)}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <main className="flex-1 bg-usco-fondo px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
