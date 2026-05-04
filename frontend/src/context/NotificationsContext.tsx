import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { NotificationItem } from '../features/auth/services/notificationService'

interface NotificationsContextValue {
  notificationCount: number
  notifications: NotificationItem[]
  refreshNotifications: () => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notificationCount, setNotificationCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const refreshNotifications = useCallback(async () => {
    // Notificaciones desactivadas temporalmente en esta version.
    setNotificationCount(0)
    setNotifications([])
  }, [])

  const markAllAsRead = useCallback(async () => {
    // Notificaciones desactivadas temporalmente en esta version.
    setNotificationCount(0)
    setNotifications((prev) => prev.map((item) => ({ ...item, leida: true })))
  }, [])

  const value = useMemo(
    () => ({
      notificationCount,
      notifications,
      refreshNotifications,
      markAllAsRead,
    }),
    [notificationCount, notifications, refreshNotifications, markAllAsRead],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationsProvider')
  }
  return context
}
