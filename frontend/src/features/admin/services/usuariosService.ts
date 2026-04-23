import axiosInstance from '../../../lib/axios'
import type { Programa } from '../../../types/evaluaciones'
import type {
  Usuario,
  UsuariosDashboardStatsResponse,
  UsuariosPaginadosResponse,
} from '../../../types/usuarios'

export interface CrearUsuarioPayload {
  nombres: string
  apellidos: string
  correo_institucional: string
  tipo_documento: string
  numero_documento: string
  rol: 'ADMIN' | 'PROFESOR' | 'ESTUDIANTE'
  is_staff?: boolean
  programa_id: number
  genero?: 'M' | 'F' | 'O' | null
  semestre_actual?: number | null
  password?: string
}

export interface EliminarUsuarioResponse {
  status?: string
  tipo_eliminacion?: 'logica' | 'fisica'
  usuario_id?: string
  mensaje?: string
}

export interface UsuariosFilters {
  rol?: string
  is_active?: '' | 'true' | 'false'
  programa?: string
  semestre?: string
}

const buildUsuariosFilterParams = (search = '', filters: UsuariosFilters = {}) => {
  const params = new URLSearchParams()

  const normalizedSearch = search.trim()
  const normalizedRol = String(filters.rol || '').trim()
  const normalizedPrograma = String(filters.programa || '').trim()
  const normalizedEstado = String(filters.is_active || '').trim().toLowerCase()
  const normalizedSemestre = String(filters.semestre || '').trim()

  if (normalizedSearch) {
    params.set('search', normalizedSearch)
  }

  if (normalizedRol) {
    params.set('rol', normalizedRol)
  }

  if (normalizedEstado === 'true' || normalizedEstado === 'false') {
    params.set('is_active', normalizedEstado)
  }

  if (normalizedPrograma) {
    params.set('programa', normalizedPrograma)
  }

  if (normalizedSemestre) {
    params.set('semestre', normalizedSemestre)
  }

  return params
}

export const getUsuarios = async (
  page = 1,
  pageSize = 10,
  search = '',
  filters: UsuariosFilters = {},
): Promise<UsuariosPaginadosResponse> => {
  const params = buildUsuariosFilterParams(search, filters)
  params.set('page', String(page))
  params.set('page_size', String(pageSize))

  const { data } = await axiosInstance.get<UsuariosPaginadosResponse>(`/auth/usuarios/?${params.toString()}`)
  return data
}

export const descargarReporteUsuariosExcel = async (
  search = '',
  filters: UsuariosFilters = {},
): Promise<void> => {
  const params = buildUsuariosFilterParams(search, filters)
  const query = params.toString()
  const url = query ? `/auth/usuarios/exportar-excel/?${query}` : '/auth/usuarios/exportar-excel/'

  const { data } = await axiosInstance.get<Blob>(url, { responseType: 'blob' })
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', 'reporte_usuarios.xlsx')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}

export const getUsuariosDashboardStats = async (): Promise<UsuariosDashboardStatsResponse> => {
  const { data } = await axiosInstance.get<UsuariosDashboardStatsResponse>(
    '/auth/usuarios/dashboard-stats/',
  )
  return data
}

export const crearUsuario = async (data: CrearUsuarioPayload): Promise<Usuario> => {
  const response = await axiosInstance.post<Usuario>('/auth/usuarios/', data)
  return response.data
}

type ProgramasRawResponse = Programa[] | { results?: Programa[] }

export const getProgramas = async (): Promise<Programa[]> => {
  const { data } = await axiosInstance.get<ProgramasRawResponse>('/auth/programas/')
  if (Array.isArray(data)) {
    return data
  }
  return Array.isArray(data.results) ? data.results : []
}

export const toggleEstadoUsuario = async ({
  id,
  is_active,
}: {
  id: string | number
  is_active: boolean
}) => {
  const { data } = await axiosInstance.patch(`/usuarios/${id}/`, { is_active })
  return data
}

export const subirExcelUsuarios = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await axiosInstance.post('/usuarios/subir_excel/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data
}

export const editarUsuario = async ({
  id,
  data,
}: {
  id: string | number
  data: Partial<Usuario> & {
    password?: string
    documento?: string
    programa_id?: number | null
    genero?: 'M' | 'F' | 'O' | null
    semestre_actual?: number | null
  }
}) => {
  const response = await axiosInstance.patch(`/usuarios/${id}/`, data)
  return response.data
}

export const eliminarUsuario = async (
  id: string | number,
): Promise<EliminarUsuarioResponse> => {
  const { data } = await axiosInstance.delete<EliminarUsuarioResponse>(`/usuarios/${id}/`)
  return data ?? {}
}

const usuariosService = {
  getUsuarios,
  descargarReporteUsuariosExcel,
  getUsuariosDashboardStats,
  getProgramas,
  toggleEstadoUsuario,
  subirExcelUsuarios,
  editarUsuario,
  crearUsuario,
  eliminarUsuario,
}

export default usuariosService
