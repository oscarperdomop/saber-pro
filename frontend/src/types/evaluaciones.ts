export interface PlantillaExamen {
  id: string | number
  titulo: string
  descripcion: string
  tiempo_minutos: number
  cantidad_preguntas?: number
  modulos?: string[]
  dificultad_referencia?: string
  fecha_inicio: string
  fecha_fin: string
  mostrar_resultados_inmediatos: boolean
  activo: boolean
  estado?: 'Activo' | 'Inactivo' | 'Borrador' | 'Archivado' | string
  tiene_intentos?: boolean
  reglas?: ReglaExamen[]
  programas_destino?: Array<number | Programa>
}

export interface ReglaExamen {
  id?: string | number
  modulo: number
  categoria?: number | null
  cantidad_preguntas: number
  nivel_dificultad: 'Facil' | 'Medio' | 'Dificil' | 'Balanceada' | string
}

export interface ReglaModuloPayload {
  modulo_id: number
  cantidad_facil: number
  cantidad_media: number
  cantidad_alta: number
}

export interface Programa {
  id: number
  nombre: string
}

export interface Categoria {
  id: number
  nombre: string
  modulo_id: number
}

export interface Competencia {
  id: number
  nombre: string
  modulo_id: number
}

export interface CrearSimulacroPayload {
  titulo: string
  descripcion: string
  tiempo_minutos: number
  fecha_inicio: string
  fecha_fin: string
  mostrar_resultados_inmediatos: boolean
  activo: boolean
  programa_id?: number | null
  reglas_modulos: ReglaModuloPayload[]
}

export interface IniciarIntentoResponse {
  intento_id: string
}

export interface IntentoPrevio {
  id: string
  plantilla_examen: string | number | { id: string | number } | null
  estado: string
  plantilla_titulo?: string
  fecha_finalizacion?: string | null
  puntaje_global?: number
  plan_estudio_ia?: string | null
}

export interface Opcion {
  id: string
  texto: string
  imagen: string | null
}

export interface Pregunta {
  id: string
  modulo_id: number
  modulo_nombre: string
  enunciado: string
  contexto_texto: string | null
  contexto_imagen: string | null
  imagen_grafica: string | null
  codigo_latex: string | null
  soporte_multimedia: 'NINGUNO' | 'IMAGEN' | 'LATEX' | string
  opciones: Opcion[]
}

export interface RespuestaEstudiante {
  id: string
  pregunta: Pregunta
  opcion_seleccionada: string | null
}

export interface DetalleResultadoRespuesta {
  es_acierto: boolean
}

export interface PuntajeModuloResultado {
  modulo: string
  puntaje: number
  percentil: number
}

export interface ResumenResultados {
  intento_id: string
  estado_calificacion: string
  puntaje_saber_pro: number
  total_preguntas: number
  aciertos_brutos: number
  plan_estudio_ia?: string | null
  detalle_respuestas?: DetalleResultadoRespuesta[]
  puntajes_por_modulo?: PuntajeModuloResultado[]
}

export interface ResultadoSimulacro {
  intento_id?: string
  posicion?: number
  estudiante_nombre: string
  programa_nombre: string
  genero?: string | null
  genero_nombre?: string
  semestre?: number | null
  fecha_fin: string | null
  puntaje_global: number
}

export interface AnaliticaDificultad {
  dificultad: string
  promedio: number
  participaciones: number
}

export interface AnaliticaCompetencia {
  competencia: string
  categoria: string
  promedio: number
  participaciones: number
}

export interface AnaliticaGenero {
  genero: string | null
  genero_nombre: string
  promedio: number
  participantes: number
}

export interface AnaliticaSemestre {
  semestre: number | null
  semestre_label: string
  promedio: number
  participantes: number
}

export interface RendimientoPreguntaSimulacro {
  pregunta_id: string
  enunciado: string
  modulo: string
  participaciones: number
  acierto_porcentaje: number
  error_porcentaje: number
}

export interface AnaliticasDetalladasSimulacro {
  simulacro_id: string
  simulacro_titulo: string
  promedio_global: number
  por_dificultad: AnaliticaDificultad[]
  por_competencia: AnaliticaCompetencia[]
  por_genero: AnaliticaGenero[]
  por_semestre: AnaliticaSemestre[]
  rendimiento_preguntas: RendimientoPreguntaSimulacro[]
}

export interface FiltrosResultadosSimulacro {
  programa?: string | number
  genero?: string
  semestre?: string | number
}

export interface ConfigReporteAvanzadoSimulacro {
  incluir_general: boolean
  incluir_programa: boolean
  incluir_demografia: boolean
  incluir_preguntas: boolean
  incluir_competencias: boolean
  programa?: string | number
  genero?: string
  semestre?: string | number
}
