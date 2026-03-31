import axiosInstance from '../../../lib/axios'
import type {
  CrearSimulacroPayload,
  PlantillaExamen,
  ResultadoSimulacro,
} from '../../../types/evaluaciones'

interface PlantillaExamenRaw extends Omit<PlantillaExamen, 'activo'> {
  activo?: boolean
  estado?: 'Activo' | 'Inactivo' | 'Borrador' | 'Archivado' | string
}

type SimulacrosRawResponse = PlantillaExamenRaw[] | { results?: PlantillaExamenRaw[] }

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

export const getResultadosSimulacro = async (id: string | number): Promise<ResultadoSimulacro[]> => {
  const { data } = await axiosInstance.get<ResultadoSimulacro[]>(
    `/evaluaciones/admin/plantillas/${id}/resultados/`,
  )
  return Array.isArray(data) ? data : []
}

const simulacrosService = {
  getSimulacros,
  getSimulacroById,
  crearSimulacro,
  actualizarSimulacro,
  eliminarSimulacro,
  archivarSimulacro,
  getResultadosSimulacro,
}

export default simulacrosService
