import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { User, UserRole } from '../types/auth'

const USER_STORAGE_KEY = 'user'
const TOKEN_STORAGE_KEY = 'token'
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token'

const parseStoredUser = (value: string | null): User | null => {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as User
  } catch {
    return null
  }
}

export const getStoredUser = (): User | null => {
  return parseStoredUser(localStorage.getItem(USER_STORAGE_KEY))
}

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export const resolveUserRole = (user: User | null): UserRole => {
  if (user?.rol === 'ADMIN' || user?.rol === 'PROFESOR' || user?.rol === 'ESTUDIANTE') {
    return user.rol
  }
  return user?.is_staff ? 'ADMIN' : 'ESTUDIANTE'
}

export const hasAdminAccess = (user: User | null): boolean => {
  const role = resolveUserRole(user)
  return role === 'ADMIN' || (role === 'PROFESOR' && Boolean(user?.is_staff))
}

export const resolveDefaultRoute = (role: UserRole, user?: User | null): string => {
  if (role === 'ADMIN') {
    return '/dashboard'
  }

  if (role === 'PROFESOR') {
    return user?.is_staff ? '/dashboard' : '/estudiante/dashboard'
  }

  return '/estudiante/dashboard'
}

export const useAuthStore = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = getStoredUser()
  const role = resolveUserRole(user)

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return {
    user,
    token: getStoredToken(),
    role,
    logout,
    isAuthenticated: Boolean(getStoredToken()),
  }
}
