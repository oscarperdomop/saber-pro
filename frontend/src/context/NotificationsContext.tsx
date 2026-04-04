import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getStoredToken, getStoredUser } from '../hooks/useAuthStore'
import { useWebSockets, type NotificationSocketEvent } from '../hooks/useWebSockets'
import {
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
  type NotificationItem,
} from '../features/auth/services/notificationService'

interface NotificationsContextValue {
  notificationCount: number
  notifications: NotificationItem[]
  refreshNotifications: () => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [userId, setUserId] = useState<string | null>(() => getStoredUser()?.id ?? null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const syncAuthState = useCallback(() => {
    const nextToken = getStoredToken()
    const nextUser = getStoredUser()

    setToken(nextToken)
    setUserId(nextUser?.id ?? null)

    if (!nextToken) {
      setNotificationCount(0)
      setNotifications([])
    }
  }, [])

  useEffect(() => {
    syncAuthState()
    window.addEventListener('storage', syncAuthState)
    window.addEventListener('auth-changed', syncAuthState as EventListener)
    window.addEventListener('focus', syncAuthState)

    return () => {
      window.removeEventListener('storage', syncAuthState)
      window.removeEventListener('auth-changed', syncAuthState as EventListener)
      window.removeEventListener('focus', syncAuthState)
    }
  }, [syncAuthState])

  const refreshNotifications = useCallback(async () => {
    if (!token) {
      setNotificationCount(0)
      setNotifications([])
      return
    }

    try {
      const [unread, latest] = await Promise.all([
        getUnreadNotificationsCount(),
        getNotifications(20),
      ])

      setNotificationCount(unread)
      setNotifications(latest)
    } catch {
      // Silencia errores de red para no afectar la experiencia principal.
    }
  }, [token])

  useEffect(() => {
    void refreshNotifications()
  }, [refreshNotifications, userId])

  const handleSocketNotification = useCallback((event: NotificationSocketEvent) => {
    if (event.type !== 'NOTIFICACION_NUEVA') {
      return
    }

    setNotificationCount((prev) => prev + 1)
    setNotifications((prev) => {
      const nextItem: NotificationItem = {
        id:
          globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : `local-${Date.now()}`,
        tipo: event.type ?? 'NOTIFICACION_NUEVA',
        mensaje: event.mensaje ?? 'Tienes una nueva notificacion.',
        leida: false,
        created_at: new Date().toISOString(),
      }
      return [nextItem, ...prev].slice(0, 20)
    })
  }, [])

  useWebSockets({
    enabled: Boolean(token && userId),
    token,
    onNotification: handleSocketNotification,
  })

  const markAllAsRead = useCallback(async () => {
    if (!token) {
      return
    }

    try {
      await markAllNotificationsAsRead()
      setNotificationCount(0)
      setNotifications((prev) => prev.map((item) => ({ ...item, leida: true })))
    } catch {
      // No-op
    }
  }, [token])

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
