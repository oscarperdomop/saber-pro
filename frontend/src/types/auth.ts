export interface User {
  id: string
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
