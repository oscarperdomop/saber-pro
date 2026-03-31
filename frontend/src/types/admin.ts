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

export interface CoberturaPrograma {
  programa_id: number
  programa_nombre: string
  total_estudiantes_activos: number
  estudiantes_con_intento_finalizado: number
  cobertura_porcentaje: number
}

export interface CoberturaProgramaResponse {
  results: CoberturaPrograma[]
}

export interface ReporteBucket {
  label: string | number
  promedio: number
  total: number
}

export interface ReportesResumenResponse {
  promedio_general_prueba: number
  total_respuestas: number
  promedio_por_dificultad: ReporteBucket[]
  promedio_por_competencia: ReporteBucket[]
  promedio_por_categoria: ReporteBucket[]
  desempeno_por_genero: ReporteBucket[]
  desempeno_por_semestre: ReporteBucket[]
}
