export interface PlantillaExamen {
  id: string | number
  titulo: string
  descripcion: string
  tiempo_minutos: number
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
  detalle_respuestas?: DetalleResultadoRespuesta[]
  puntajes_por_modulo?: PuntajeModuloResultado[]
}

export interface ResultadoSimulacro {
  estudiante_nombre: string
  programa_nombre: string
  fecha_fin: string | null
  puntaje_global: number
}
