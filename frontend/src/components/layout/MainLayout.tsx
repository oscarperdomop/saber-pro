import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

const DRAWER_BREAKPOINT = 1400

const MainLayout = () => {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDrawerMode, setIsDrawerMode] = useState(() => window.innerWidth < DRAWER_BREAKPOINT)

  useEffect(() => {
    const handleResize = () => {
      const nextDrawerMode = window.innerWidth < DRAWER_BREAKPOINT
      setIsDrawerMode(nextDrawerMode)
      if (!nextDrawerMode) {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isDrawerMode) {
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
  }, [isDrawerMode, isSidebarOpen])

  return (
    <div className={`h-full overflow-hidden bg-usco-fondo ${isDrawerMode ? '' : 'flex'}`}>
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        isDrawerMode={isDrawerMode}
        onCloseMobileSidebar={() => setIsSidebarOpen(false)}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          onOpenMobileSidebar={() => setIsSidebarOpen(true)}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          isDrawerMode={isDrawerMode}
        />
        <main className="min-h-0 flex-1 overflow-y-auto bg-usco-fondo px-4 py-5 sm:px-6 lg:px-8">
          <Outlet key={`${location.pathname}${location.search}`} />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
