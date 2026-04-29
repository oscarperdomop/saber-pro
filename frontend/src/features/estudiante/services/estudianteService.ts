import axiosInstance from '../../../lib/axios'
import type {
  IniciarIntentoResponse,
  IntentoPrevio,
  PlantillaExamen,
  RespuestaEstudiante,
  ResumenResultados,
} from '../../../types/evaluaciones'

const getExamenesDisponibles = async (): Promise<PlantillaExamen[]> => {
  const { data } = await axiosInstance.get<PlantillaExamen[]>('/evaluaciones/estudiante/examenes/')
  return Array.isArray(data) ? data : []
}

const getSimulacrosDisponibles = async (): Promise<PlantillaExamen[]> => {
  return getExamenesDisponibles()
}

const getMisIntentos = async (): Promise<IntentoPrevio[]> => {
  const { data } = await axiosInstance.get<IntentoPrevio[]>('/evaluaciones/estudiante/mis-intentos/')
  return Array.isArray(data) ? data : []
}

const getIntentoById = async (intentoId: string): Promise<IntentoPrevio> => {
  const { data } = await axiosInstance.get<IntentoPrevio>(
    `/evaluaciones/estudiante/mis-intentos/${intentoId}/`,
  )
  return data
}

const iniciarIntento = async (plantillaId: string): Promise<IniciarIntentoResponse> => {
  const { data } = await axiosInstance.post<IniciarIntentoResponse>(
    `/evaluaciones/estudiante/examenes/${plantillaId}/iniciar_intento/`,
  )
  return data
}

const getRespuestasIntento = async (intentoId: string): Promise<RespuestaEstudiante[]> => {
  const { data } = await axiosInstance.get<RespuestaEstudiante[]>(
    `/evaluaciones/estudiante/mis-intentos/${intentoId}/cargar_respuestas/`,
  )
  return Array.isArray(data) ? data : []
}

const guardarRespuesta = async (respuestaId: string, opcionId: string): Promise<void> => {
  await axiosInstance.patch(`/evaluaciones/estudiante/respuestas/${respuestaId}/`, {
    opcion_seleccionada: opcionId,
  })
}

const finalizarIntento = async (intentoId: string): Promise<{ estado: string }> => {
  const { data } = await axiosInstance.post<{ estado: string }>(
    `/evaluaciones/estudiante/mis-intentos/${intentoId}/finalizar/`,
  )
  return data
}

const getResumenResultados = async (intentoId: string): Promise<ResumenResultados> => {
  const { data } = await axiosInstance.get<ResumenResultados>(
    `/evaluaciones/estudiante/mis-intentos/${intentoId}/resumen_resultados/`,
  )
  return data
}

const generarPlanEstudioIA = async (intentoId: string): Promise<{ plan: string }> => {
  const { data } = await axiosInstance.post<{ plan: string }>(
    `/evaluaciones/estudiante/mis-intentos/${intentoId}/generar_plan_estudio/`,
  )
  return data
}

const estudianteService = {
  getExamenesDisponibles,
  getSimulacrosDisponibles,
  getMisIntentos,
  getIntentoById,
  iniciarIntento,
  getRespuestasIntento,
  guardarRespuesta,
  finalizarIntento,
  getResumenResultados,
  generarPlanEstudioIA,
}

export default estudianteService
export {
  finalizarIntento,
  generarPlanEstudioIA,
  getExamenesDisponibles,
  getMisIntentos,
  getIntentoById,
  getRespuestasIntento,
  getSimulacrosDisponibles,
  getResumenResultados,
  guardarRespuesta,
  iniciarIntento,
}
