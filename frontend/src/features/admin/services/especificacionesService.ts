import axiosInstance from '../../../lib/axios'
import type { Categoria, Competencia } from '../../../types/evaluaciones'

type CategoriaResponse = Categoria[] | { results?: Categoria[] }
type CompetenciaResponse = Competencia[] | { results?: Competencia[] }

const normalizeList = <T,>(data: T[] | { results?: T[] }): T[] => {
  if (Array.isArray(data)) {
    return data
  }

  return Array.isArray(data.results) ? data.results : []
}

export const getCategorias = async (moduloId: number): Promise<Categoria[]> => {
  const { data } = await axiosInstance.get<CategoriaResponse>(
    `/evaluaciones/admin/categorias/?modulo_id=${moduloId}`,
  )
  return normalizeList(data)
}

export const crearCategoria = async (payload: { nombre: string; modulo_id: number }) => {
  const { data } = await axiosInstance.post('/evaluaciones/admin/categorias/', payload)
  return data
}

export const eliminarCategoria = async (id: number | string) => {
  const { data } = await axiosInstance.delete(`/evaluaciones/admin/categorias/${id}/`)
  return data
}

export const getCompetencias = async (moduloId: number): Promise<Competencia[]> => {
  const { data } = await axiosInstance.get<CompetenciaResponse>(
    `/evaluaciones/admin/competencias/?modulo_id=${moduloId}`,
  )
  return normalizeList(data)
}

export const crearCompetencia = async (payload: { nombre: string; modulo_id: number }) => {
  const { data } = await axiosInstance.post('/evaluaciones/admin/competencias/', payload)
  return data
}

export const eliminarCompetencia = async (id: number | string) => {
  const { data } = await axiosInstance.delete(`/evaluaciones/admin/competencias/${id}/`)
  return data
}

const especificacionesService = {
  getCategorias,
  crearCategoria,
  eliminarCategoria,
  getCompetencias,
  crearCompetencia,
  eliminarCompetencia,
}

export default especificacionesService
