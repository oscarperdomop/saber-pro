import axiosInstance from '../../../lib/axios'

export interface NotificationItem {
  id: string
  tipo: string
  mensaje: string
  leida: boolean
  created_at: string
}

interface NotificationCountResponse {
  no_leidas: number
}

export const getUnreadNotificationsCount = async () => {
  const response = await axiosInstance.get<NotificationCountResponse>('/auth/notificaciones/contador/')
  return response.data.no_leidas
}

export const getNotifications = async (limit = 20) => {
  const response = await axiosInstance.get<NotificationItem[]>('/auth/notificaciones/', {
    params: { limit },
  })
  return response.data
}

export const markNotificationsAsRead = async (ids: string[]) => {
  const response = await axiosInstance.patch('/auth/notificaciones/', { ids })
  return response.data
}

export const markAllNotificationsAsRead = async () => {
  const response = await axiosInstance.patch('/auth/notificaciones/', { marcar_todas: true })
  return response.data
}
