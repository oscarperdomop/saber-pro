import axiosInstance from '../../../lib/axios'
import type { LoginCredentials, LoginResponse } from '../../../types/auth'

export interface ActivarCuentaPayload {
  password_actual: string
  password_nueva: string
}

const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const { data } = await axiosInstance.post<LoginResponse>('/auth/login/', credentials)
  return data
}

const activarCuenta = async (payload: ActivarCuentaPayload): Promise<void> => {
  await axiosInstance.put('/auth/activar/', payload)
}

const authService = {
  login,
  activarCuenta,
}

export default authService
