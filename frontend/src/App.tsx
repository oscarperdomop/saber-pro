import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppRouter from './routes/AppRouter'
import { NotificationsProvider } from './context/NotificationsContext'
import { applyDarkModeClass, isDarkModeEnabled } from './lib/theme'

const queryClient = new QueryClient()

function App() {
  useEffect(() => {
    applyDarkModeClass(isDarkModeEnabled())
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>
        <AppRouter />
      </NotificationsProvider>
    </QueryClientProvider>
  )
}

export default App
