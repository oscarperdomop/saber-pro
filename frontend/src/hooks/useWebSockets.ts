import { useEffect, useRef } from 'react'

export interface NotificationSocketEvent {
  type?: string
  mensaje?: string
  payload?: Record<string, unknown>
}

interface UseWebSocketsOptions {
  enabled: boolean
  token: string | null
  onNotification: (event: NotificationSocketEvent) => void
}

const buildWebSocketUrl = (token: string) => {
  const wsBase = String(import.meta.env.VITE_WS_URL ?? '').trim()
  const encodedToken = encodeURIComponent(token)

  if (wsBase) {
    const normalizedBase = wsBase.replace(/\/+$/, '')
    const alreadyHasPath = /\/ws\/notificaciones$/.test(normalizedBase)
    const endpoint = alreadyHasPath ? normalizedBase : `${normalizedBase}/ws/notificaciones`
    const wsEndpoint = endpoint
      .replace(/^http:\/\//i, 'ws://')
      .replace(/^https:\/\//i, 'wss://')

    if (/^wss?:\/\//i.test(wsEndpoint)) {
      return `${wsEndpoint}/?token=${encodedToken}`
    }

    const browserWsOrigin = window.location.origin
      .replace(/^http:\/\//i, 'ws://')
      .replace(/^https:\/\//i, 'wss://')
      .replace(/\/+$/, '')
    const wsPath = wsEndpoint.startsWith('/') ? wsEndpoint : `/${wsEndpoint}`
    return `${browserWsOrigin}${wsPath}/?token=${encodedToken}`
  }

  const apiBase = String(import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/').replace(/\/+$/, '')
  const isAbsoluteApi = /^https?:\/\//i.test(apiBase)
  const browserWsOrigin = window.location.origin
    .replace(/^http:\/\//i, 'ws://')
    .replace(/^https:\/\//i, 'wss://')
    .replace(/\/+$/, '')
  const wsOrigin = isAbsoluteApi
    ? (apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase)
        .replace(/^http:\/\//i, 'ws://')
        .replace(/^https:\/\//i, 'wss://')
    : browserWsOrigin

  return `${wsOrigin}/ws/notificaciones/?token=${encodedToken}`
}

export const useWebSockets = ({ enabled, token, onNotification }: UseWebSocketsOptions) => {
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled || !token) {
      return undefined
    }

    let isMounted = true
    let shouldReconnect = true

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const scheduleReconnect = () => {
      clearReconnectTimer()
      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 15000)
      reconnectAttemptsRef.current += 1

      reconnectTimerRef.current = window.setTimeout(() => {
        connect()
      }, delay)
    }

    const connect = () => {
      if (!isMounted) {
        return
      }

      try {
        const socket = new WebSocket(buildWebSocketUrl(token))
        socketRef.current = socket

        socket.onopen = () => {
          reconnectAttemptsRef.current = 0
        }

        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data) as NotificationSocketEvent
            onNotification(parsed)
          } catch {
            // Ignora mensajes no-JSON.
          }
        }

        socket.onerror = () => {
          socket.close()
        }

        socket.onclose = () => {
          if (shouldReconnect) {
            scheduleReconnect()
          }
        }
      } catch {
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      isMounted = false
      shouldReconnect = false
      clearReconnectTimer()
      const currentSocket = socketRef.current
      if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
        currentSocket.close()
      }
      socketRef.current = null
    }
  }, [enabled, token, onNotification])
}
