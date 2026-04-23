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

export interface RolCount {
  rol: 'ADMIN' | 'PROFESOR' | 'ESTUDIANTE'
  total: number
}

export interface PorRolStats {
  admin: number
  profesor: number
  estudiante: number
  detalle: RolCount[]
}

export interface GeneroStats {
  genero: 'M' | 'F' | 'O' | 'SIN_DATO' | string
  genero_nombre: string
  total: number
}

export interface ProgramaStats {
  programa: string
  total: number
}

export interface SemestreStats {
  semestre: number | null
  semestre_nombre: string
  total: number
}

export interface UsuariosDashboardStatsResponse {
  total_usuarios: number
  usuarios_activos: number
  total_estudiantes: number
  por_rol: PorRolStats
  por_genero: GeneroStats[]
  por_programa: ProgramaStats[]
  por_semestre: SemestreStats[]
}
