export interface ParticipacionPrograma {
  estudiante__programa__nombre: string
  total: number
}

export interface PreguntaCritica {
  pregunta__enunciado: string
  total_veces: number
  veces_incorrecta: number
}

export interface AnaliticasResponse {
  total_evaluaciones_finalizadas: number
  participacion_por_programa: ParticipacionPrograma[]
  top_preguntas_criticas: PreguntaCritica[]
}
