import axiosInstance from '../../../lib/axios'
import type { AnaliticasResponse } from '../../../types/admin'

export const getKpisGlobales = async (): Promise<AnaliticasResponse> => {
  const { data } = await axiosInstance.get<AnaliticasResponse>('/admin/analiticas/kpis_globales/')
  return data
}

const adminService = {
  getKpisGlobales,
}

export default adminService
