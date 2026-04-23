import axiosInstance from '../../../lib/axios'
import type {
  AnaliticasDetalladasSimulacro,
  ConfigReporteAvanzadoSimulacro,
  CrearSimulacroPayload,
  FiltrosResultadosSimulacro,
  PlantillaExamen,
  ResultadoSimulacro,
  SimulacrosDashboardStats,
} from '../../../types/evaluaciones'

interface PlantillaExamenRaw extends Omit<PlantillaExamen, 'activo'> {
  activo?: boolean
  estado?: 'Activo' | 'Inactivo' | 'Borrador' | 'Archivado' | string
}

type SimulacrosRawResponse = PlantillaExamenRaw[] | { results?: PlantillaExamenRaw[] }

const buildFiltrosQuery = (filtros?: FiltrosResultadosSimulacro) => {
  const params = new URLSearchParams()
  if (!filtros) {
    return ''
  }

  if (filtros.programa !== undefined && filtros.programa !== null && String(filtros.programa).trim()) {
    params.set('programa', String(filtros.programa).trim())
  }

  if (filtros.genero && String(filtros.genero).trim()) {
    params.set('genero', String(filtros.genero).trim())
  }

  if (filtros.semestre !== undefined && filtros.semestre !== null && String(filtros.semestre).trim()) {
    params.set('semestre', String(filtros.semestre).trim())
  }

  return params.toString()
}

const normalizeSimulacro = (simulacro: PlantillaExamenRaw): PlantillaExamen => {
  const estado = simulacro.estado ?? (simulacro.activo ? 'Activo' : 'Inactivo')

  return {
    ...simulacro,
    mostrar_resultados_inmediatos: Boolean(simulacro.mostrar_resultados_inmediatos),
    activo: estado === 'Activo',
    tiene_intentos: Boolean(simulacro.tiene_intentos),
  }
}

const buildSimulacroRequestPayload = (payload: CrearSimulacroPayload) => {
  const reglasExpandidadas = payload.reglas_modulos.flatMap((regla) => {
    const modulo = regla.modulo_id
    const reglasPorDificultad = [
      {
        modulo,
        cantidad_preguntas: Number(regla.cantidad_facil),
        nivel_dificultad: 'Facil',
      },
      {
        modulo,
        cantidad_preguntas: Number(regla.cantidad_media),
        nivel_dificultad: 'Medio',
      },
      {
        modulo,
        cantidad_preguntas: Number(regla.cantidad_alta),
        nivel_dificultad: 'Dificil',
      },
    ]

    return reglasPorDificultad.filter((item) => item.cantidad_preguntas > 0)
  })

  return {
    titulo: payload.titulo,
    descripcion: payload.descripcion,
    tiempo_minutos: payload.tiempo_minutos,
    fecha_inicio: payload.fecha_inicio,
    fecha_fin: payload.fecha_fin,
    mostrar_resultados_inmediatos: payload.mostrar_resultados_inmediatos,
    estado: payload.activo ? 'Activo' : 'Inactivo',
    reglas: reglasExpandidadas,
    programas_destino: payload.programa_id ? [payload.programa_id] : [],
  }
}

export const getSimulacros = async (
  incluirArchivados: boolean = false,
): Promise<PlantillaExamen[]> => {
  const { data } = await axiosInstance.get<SimulacrosRawResponse>(
    `/evaluaciones/admin/plantillas/?incluir_archivados=${incluirArchivados}`,
  )

  const rawSimulacros = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
  return rawSimulacros.map(normalizeSimulacro)
}

export const crearSimulacro = async (payload: CrearSimulacroPayload): Promise<PlantillaExamen> => {
  const requestPayload = buildSimulacroRequestPayload(payload)

  const { data } = await axiosInstance.post<PlantillaExamenRaw>(
    '/evaluaciones/admin/plantillas/',
    requestPayload,
  )

  return normalizeSimulacro(data)
}

export const getSimulacroById = async (id: string | number): Promise<PlantillaExamen> => {
  const { data } = await axiosInstance.get<PlantillaExamenRaw>(`/evaluaciones/admin/plantillas/${id}/`)
  return normalizeSimulacro(data)
}

export const actualizarSimulacro = async (
  id: string | number,
  payload: CrearSimulacroPayload,
): Promise<PlantillaExamen> => {
  const requestPayload = buildSimulacroRequestPayload(payload)
  const { data } = await axiosInstance.patch<PlantillaExamenRaw>(
    `/evaluaciones/admin/plantillas/${id}/`,
    requestPayload,
  )
  return normalizeSimulacro(data)
}

export const eliminarSimulacro = async (id: string | number): Promise<void> => {
  await axiosInstance.delete(`/evaluaciones/admin/plantillas/${id}/`)
}

export const archivarSimulacro = async (id: string | number): Promise<{ detail: string }> => {
  const { data } = await axiosInstance.post<{ detail: string }>(
    `/evaluaciones/admin/plantillas/${id}/archivar/`,
  )
  return data
}

export const getSimulacrosDashboardStats = async (): Promise<SimulacrosDashboardStats> => {
  const { data } = await axiosInstance.get<SimulacrosDashboardStats>(
    '/evaluaciones/admin/simulacros/dashboard-stats/',
  )
  return {
    globales: {
      total: Number(data?.globales?.total ?? 0),
      activos: Number(data?.globales?.activos ?? 0),
    },
    simulacros_activos: Array.isArray(data?.simulacros_activos) ? data.simulacros_activos : [],
  }
}

export const getResultadosSimulacro = async (
  id: string | number,
  filtros?: FiltrosResultadosSimulacro,
): Promise<ResultadoSimulacro[]> => {
  const query = buildFiltrosQuery(filtros)
  const suffix = query ? `?${query}` : ''

  const { data } = await axiosInstance.get<ResultadoSimulacro[]>(
    `/evaluaciones/admin/plantillas/${id}/resultados/${suffix}`,
  )
  return Array.isArray(data) ? data : []
}

export const obtenerAnaliticasSimulacro = async (
  id: string | number,
  filtros?: FiltrosResultadosSimulacro,
): Promise<AnaliticasDetalladasSimulacro> => {
  const query = buildFiltrosQuery(filtros)
  const suffix = query ? `?${query}` : ''
  const { data } = await axiosInstance.get<AnaliticasDetalladasSimulacro>(
    `/evaluaciones/admin/plantillas/${id}/analiticas_detalladas/${suffix}`,
  )
  return data
}

export const descargarMuestraSimulacro = async (id: string | number): Promise<void> => {
  const response = await axiosInstance.get<Blob>(`/evaluaciones/admin/plantillas/${id}/descargar_muestra/`, {
    responseType: 'blob',
  })

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  const contentDisposition = response.headers?.['content-disposition'] ?? ''
  const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition)
  const fileName = fileNameMatch?.[1] ?? `Muestra_Simulacro_${id}.csv`

  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const exportarResultadosExcel = async (
  id: string | number,
  filtros?: FiltrosResultadosSimulacro,
): Promise<void> => {
  const query = buildFiltrosQuery(filtros)
  const suffix = query ? `?${query}` : ''

  const response = await axiosInstance.get<Blob>(
    `/evaluaciones/admin/plantillas/${id}/exportar_excel_resultados/${suffix}`,
    {
      responseType: 'blob',
    },
  )

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  const contentDisposition = response.headers?.['content-disposition'] ?? ''
  const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition)
  const fileName = fileNameMatch?.[1] ?? `Reporte_Resultados_${id}.xlsx`

  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const descargarReporteAvanzado = async (
  id: string | number,
  config: ConfigReporteAvanzadoSimulacro,
): Promise<void> => {
  const response = await axiosInstance.post<Blob>(
    `/evaluaciones/admin/plantillas/${id}/generar_reporte_excel_avanzado/`,
    config,
    {
      responseType: 'blob',
    },
  )

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  const contentDisposition = response.headers?.['content-disposition'] ?? ''
  const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition)
  const fileName = fileNameMatch?.[1] ?? `Reporte_Avanzado_Simulacro_${id}.xlsx`

  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

const simulacrosService = {
  getSimulacros,
  getSimulacroById,
  crearSimulacro,
  actualizarSimulacro,
  eliminarSimulacro,
  archivarSimulacro,
  getSimulacrosDashboardStats,
  getResultadosSimulacro,
  obtenerAnaliticasSimulacro,
  exportarResultadosExcel,
  descargarReporteAvanzado,
  descargarMuestraSimulacro,
}

export default simulacrosService
