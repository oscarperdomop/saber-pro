import axiosInstance from '../../../lib/axios'
import type {
  AnaliticasResponse,
  CoberturaProgramaResponse,
  ReportesResumenResponse,
} from '../../../types/admin'

export const getKpisGlobales = async (): Promise<AnaliticasResponse> => {
  const { data } = await axiosInstance.get<AnaliticasResponse>('/admin/analiticas/kpis_globales/')
  return data
}

export const getCoberturaPrograma = async (): Promise<CoberturaProgramaResponse> => {
  const { data } = await axiosInstance.get<CoberturaProgramaResponse>(
    '/admin/analiticas/cobertura_programa/',
  )
  return data
}

export const getReportesResumen = async (programaId?: number): Promise<ReportesResumenResponse> => {
  const suffix = typeof programaId === 'number' ? `?programa_id=${programaId}` : ''
  const { data } = await axiosInstance.get<ReportesResumenResponse>(`/admin/reportes/resumen/${suffix}`)
  return data
}

const adminService = {
  getKpisGlobales,
  getCoberturaPrograma,
  getReportesResumen,
}

export default adminService
