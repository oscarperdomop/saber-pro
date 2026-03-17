export interface Usuario {
  id: string | number
  nombres: string
  apellidos: string
  correo_institucional: string
  tipo_documento: string
  numero_documento: string
  is_staff: boolean
  is_active: boolean
  programa?: string
}

export interface UsuariosPaginadosResponse {
  count: number
  next: string | null
  previous: string | null
  results: Usuario[]
}
