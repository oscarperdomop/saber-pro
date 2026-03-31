export interface Modulo {
  id: number
  nombre: string
  descripcion?: string
}

export interface Opcion {
  id: string | number
  texto: string | null
  es_correcta: boolean
  imagen?: File | string | null
}

export interface Pregunta {
  id: string | number
  enunciado: string
  contexto_texto?: string | null
  imagen_grafica?: File | string | null
  codigo_latex?: string | null
  soporte_multimedia?: 'NINGUNO' | 'IMAGEN' | 'LATEX' | string
  tipo_pregunta: 'Opcion Multiple' | 'Ensayo' | string
  dificultad: 'Facil' | 'Media' | 'Alta' | 'Medio' | 'Dificil' | string
  estado?: 'Borrador' | 'Publicada' | 'Archivada' | string
  categoria?: number | null
  competencia?: number | null
  categoria_id?: number | null
  competencia_id?: number | null
  modulo: Modulo | number
  modulo_id?: number
  modulo_nombre?: string
  opciones: Opcion[]
  limite_palabras?: number | null
  nivel_dificultad?: string
}

export interface PreguntasPaginadasResponse {
  count: number
  next: string | null
  previous: string | null
  results: Pregunta[]
}

export interface PreguntaPayload {
  enunciado: string
  contexto_texto?: string
  imagen_grafica?: File | string | null
  codigo_latex?: string | null
  soporte_multimedia?: 'NINGUNO' | 'IMAGEN' | 'LATEX' | string
  tipo_pregunta: string
  dificultad: string
  estado?: 'Borrador' | 'Publicada' | 'Archivada' | string
  modulo_id: number
  categoria_id?: number | null
  competencia_id?: number | null
  limite_palabras?: number | null
  opciones?: { texto: string; es_correcta: boolean; imagen?: File | string | null }[]
}
