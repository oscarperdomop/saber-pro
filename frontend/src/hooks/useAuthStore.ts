import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '../types/auth'

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

export const useAuthStore = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
    queryClient.clear()
    navigate('/', { replace: true })
  }

  return {
    user: getStoredUser(),
    token: getStoredToken(),
    logout,
    isAuthenticated: Boolean(getStoredToken()),
  }
}
