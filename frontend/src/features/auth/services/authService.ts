import axiosInstance from '../../../lib/axios'
import type { LoginCredentials, LoginResponse, MiPerfil } from '../../../types/auth'

export interface ActivarCuentaPayload {
  password_actual: string
  password_nueva: string
}

export interface CambiarMiPasswordPayload {
  password_nueva: string
}

const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const { data } = await axiosInstance.post<LoginResponse>('/auth/login/', credentials)
  return data
}

const activarCuenta = async (payload: ActivarCuentaPayload): Promise<void> => {
  await axiosInstance.put('/auth/activar/', payload)
}

const getMiPerfil = async (): Promise<MiPerfil> => {
  const { data } = await axiosInstance.get<MiPerfil>('/auth/perfil/')
  return data
}

const cambiarMiPassword = async (payload: CambiarMiPasswordPayload): Promise<void> => {
  await axiosInstance.patch('/auth/perfil/', payload)
}

const authService = {
  login,
  activarCuenta,
  getMiPerfil,
  cambiarMiPassword,
}

export default authService
