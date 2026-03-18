export type UserRole = 'ADMIN' | 'ESTUDIANTE'

export interface User {
  id: string
  rol: UserRole
  correo_institucional: string
  nombres: string
  apellidos: string
  is_staff: boolean
  es_primer_ingreso: boolean
}

export interface LoginResponse extends User {
  access: string
  refresh: string
}

export interface LoginCredentials {
  correo_institucional: string
  password: string
}

export interface MiPerfil {
  id: string
  rol: UserRole
  nombres: string
  apellidos: string
  correo_institucional: string
  tipo_documento: string
  numero_documento: string
  programa: string
  is_staff: boolean
  is_active: boolean
  es_primer_ingreso: boolean
}
