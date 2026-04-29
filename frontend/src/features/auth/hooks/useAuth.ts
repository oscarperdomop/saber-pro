import type { AxiosError } from 'axios'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import authService from '../services/authService'
import type { LoginCredentials, LoginResponse, User } from '../../../types/auth'
import { resolveDefaultRoute } from '../../../hooks/useAuthStore'

interface LoginErrorResponse {
  detail?: string
}

export const useAuth = () => {
  const navigate = useNavigate()

  return useMutation<LoginResponse, AxiosError<LoginErrorResponse>, LoginCredentials>({
    mutationFn: authService.login,
    onMutate: () => {
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth-changed'))
    },
    onSuccess: (data) => {
      const role = data.rol
      const userData: User = {
        id: data.id,
        rol: role,
        correo_institucional: data.correo_institucional,
        nombres: data.nombres,
        apellidos: data.apellidos,
        is_staff: data.is_staff,
        es_primer_ingreso: data.es_primer_ingreso,
      }

      localStorage.setItem('token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('user', JSON.stringify(userData))
      window.dispatchEvent(new Event('auth-changed'))

      if (data.es_primer_ingreso) {
        navigate('/activar-cuenta')
        return
      }

      navigate(resolveDefaultRoute(role, userData))
    },
  })
}
