import axiosInstance from '../../../lib/axios'
import type {
  IntentoPrevio,
  IniciarIntentoResponse,
  PlantillaExamen,
  RespuestaEstudiante,
  ResumenResultados,
} from '../../../types/evaluaciones'

const getExamenesDisponibles = async (): Promise<PlantillaExamen[]> => {
  const { data } = await axiosInstance.get<PlantillaExamen[]>('/evaluaciones/estudiante/examenes/')
  return data
}

export const getMisIntentos = async (): Promise<IntentoPrevio[]> => {
  const { data } = await axiosInstance.get<IntentoPrevio[]>('/evaluaciones/estudiante/mis-intentos/')
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
  return data
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

const evaluacionesService = {
  getExamenesDisponibles,
  getMisIntentos,
  iniciarIntento,
  getRespuestasIntento,
  guardarRespuesta,
  finalizarIntento,
  getResumenResultados,
}

export default evaluacionesService
