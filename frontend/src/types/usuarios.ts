export interface Usuario {
  id: string | number
  rol: 'ADMIN' | 'PROFESOR' | 'ESTUDIANTE'
  nombres: string
  apellidos: string
  correo_institucional: string
  tipo_documento: string
  numero_documento: string
  genero?: 'M' | 'F' | 'O' | null
  semestre_actual?: number | null
  is_staff: boolean
  is_active: boolean
  programa?: string
  programa_id?: number | null
}

export interface UsuariosPaginadosResponse {
  count: number
  next: string | null
  previous: string | null
  results: Usuario[]
}
