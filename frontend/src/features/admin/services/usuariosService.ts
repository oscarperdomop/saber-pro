import axiosInstance from '../../../lib/axios'
import type { Programa } from '../../../types/evaluaciones'
import type { Usuario, UsuariosPaginadosResponse } from '../../../types/usuarios'

export const getUsuarios = async (
  page = 1,
  pageSize = 10,
  search = '',
): Promise<UsuariosPaginadosResponse> => {
  const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''
  const { data } = await axiosInstance.get<UsuariosPaginadosResponse>(
    `/auth/usuarios/?page=${page}&page_size=${pageSize}${searchParam}`,
  )
  return data
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
  data: Partial<Usuario>
}) => {
  const response = await axiosInstance.patch(`/usuarios/${id}/`, data)
  return response.data
}

const usuariosService = {
  getUsuarios,
  getProgramas,
  toggleEstadoUsuario,
  subirExcelUsuarios,
  editarUsuario,
}

export default usuariosService
