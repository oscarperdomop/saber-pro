import axiosInstance from '../../../lib/axios'
import type {
  Modulo,
  Pregunta,
  PreguntaPayload,
  PreguntasPaginadasResponse,
} from '../../../types/preguntas'

type PreguntasRawResponse = Pregunta[] | PreguntasPaginadasResponse
type ModulosRawResponse = Modulo[] | { results?: Modulo[] }
type OpcionIAResponse = { texto?: string; es_correcta?: boolean }
type GenerarOpcionesIAResponse = OpcionIAResponse[] | { opciones?: OpcionIAResponse[] }
type PreviewLatexResponse = {
  status?: string
  pdf_base64?: string
  preview_png_base64?: string
  detalle?: string
  detail?: string
}

export interface PreviewLatexResult {
  pdfBase64: string
  pngBase64?: string
}
type ActualizarPreguntaApiResponse =
  | Pregunta
  | {
      mensaje?: string
      versionada?: boolean
      nueva_pregunta?: Pregunta
    }

export interface ActualizarPreguntaResult {
  pregunta: Pregunta
  versionada: boolean
  mensaje?: string
  status: number
}

export interface CargaMasivaPreguntasResponse {
  status: string
  mensaje?: string
  creadas?: number
  omitidas?: number
  sin_ia_por_error?: number
  preguntas_creadas: number
  filas_con_ia: number
  filas_omitidas?: number
  lote_id?: string
  errores: Array<{ fila: number; error: string }>
}

export interface RevertirCargaMasivaResponse {
  status: string
  cantidad_eliminada: number
  mensaje: string
}

export interface BulkUpdateEstadoPreguntasResponse {
  status: string
  actualizados: number
  sin_cambio: number
  bloqueadas_historial: number
  no_encontrados: number
  estado_aplicado: 'Publicada' | 'Borrador' | 'Archivada' | string
}

export interface PlantillaCargaMasivaDownload {
  blob: Blob
  filename: string
}

export interface EliminarPreguntaResponse {
  status?: string
  tipo_eliminacion?: 'logica' | 'fisica'
  pregunta_id?: string
  mensaje?: string
}

export interface PreguntaCriticaRow extends Pregunta {
  tasa_error: number
  total_respondidas: number
  respuestas_incorrectas: number
}

export interface PreguntasCriticasResponse {
  umbral: number
  total: number
  results: PreguntaCriticaRow[]
}

export interface GetPreguntasParams {
  moduloId?: number | string
  moduloNombre?: string
  estado?: 'Todas' | 'Publicada' | 'Borrador' | 'Archivada' | string
  tipoPregunta?: 'Todos' | 'Opcion Multiple' | 'Ensayo' | string
  dificultad?: 'Todas' | 'Fácil' | 'Facil' | 'Media' | 'Alta' | string
  ordering?: '-created_at' | 'created_at' | 'enunciado' | '-enunciado' | string
}

const getDificultad = (pregunta: Pregunta): string => {
  const base = pregunta.dificultad || pregunta.nivel_dificultad || ''

  if (base === 'Medio') {
    return 'Media'
  }

  if (base === 'Dificil') {
    return 'Alta'
  }

  return base || 'Media'
}

const getTipoPregunta = (pregunta: Pregunta): string => {
  if (pregunta.tipo_pregunta) {
    return pregunta.tipo_pregunta
  }

  return pregunta.limite_palabras !== null && pregunta.limite_palabras !== undefined
    ? 'Ensayo'
    : 'Opcion Multiple'
}

const normalizePregunta = (pregunta: Pregunta): Pregunta => {
  const modulo = pregunta.modulo
  const moduloObj: Modulo | number =
    typeof modulo === 'object' && modulo !== null
      ? modulo
      : {
          id: Number(pregunta.modulo_id ?? modulo ?? 0),
          nombre: pregunta.modulo_nombre ?? `Módulo ${String(modulo ?? pregunta.modulo_id ?? '')}`,
          descripcion: '',
        }

  return {
    ...pregunta,
    soporte_multimedia:
      (pregunta.soporte_multimedia as 'NINGUNO' | 'IMAGEN' | 'LATEX' | undefined) ?? 'NINGUNO',
    codigo_latex: pregunta.codigo_latex ?? null,
    imagen_grafica: pregunta.imagen_grafica ?? null,
    categoria_id:
      pregunta.categoria_id ??
      (typeof pregunta.categoria === 'number' ? pregunta.categoria : null),
    competencia_id:
      pregunta.competencia_id ??
      (typeof pregunta.competencia === 'number' ? pregunta.competencia : null),
    modulo: moduloObj,
    tipo_pregunta: getTipoPregunta(pregunta),
    dificultad: getDificultad(pregunta),
    opciones: pregunta.opciones ?? [],
  }
}

const mapPreguntaPayloadToApi = (payload: PreguntaPayload) => {
  const { categoria_id, competencia_id, ...restPayload } = payload

  return {
    ...restPayload,
    categoria: categoria_id ?? null,
    competencia: competencia_id ?? null,
  }
}

export const getPreguntas = async (
  incluirArchivadas: boolean = false,
  filtros?: GetPreguntasParams,
): Promise<Pregunta[]> => {
  const params: Record<string, string | number | boolean> = {
    incluir_archivadas: incluirArchivadas,
  }

  if (typeof filtros?.moduloId === 'number' || String(filtros?.moduloId ?? '').trim()) {
    params.modulo_id = String(filtros?.moduloId).trim()
  }
  if (String(filtros?.moduloNombre ?? '').trim()) {
    params.modulo_nombre = String(filtros?.moduloNombre).trim()
  }
  if (filtros?.estado && filtros.estado !== 'Todas') {
    params.estado = filtros.estado
  }
  if (filtros?.tipoPregunta && filtros.tipoPregunta !== 'Todos') {
    params.tipo_pregunta = filtros.tipoPregunta
  }
  if (filtros?.dificultad && filtros.dificultad !== 'Todas') {
    params.dificultad = filtros.dificultad
  }
  if (String(filtros?.ordering ?? '').trim()) {
    params.ordering = String(filtros?.ordering).trim()
  }

  const { data } = await axiosInstance.get<PreguntasRawResponse>(
    '/evaluaciones/admin/preguntas/',
    { params },
  )
  const preguntas = Array.isArray(data)
    ? data
    : Array.isArray((data as PreguntasPaginadasResponse).results)
      ? (data as PreguntasPaginadasResponse).results
      : []

  return preguntas.map(normalizePregunta)
}

export const getPreguntaById = async (id: number | string): Promise<Pregunta> => {
  const { data } = await axiosInstance.get<Pregunta>(`/evaluaciones/admin/preguntas/${id}/`)
  return normalizePregunta(data)
}

export const getModulos = async (): Promise<Modulo[]> => {
  const { data } = await axiosInstance.get<ModulosRawResponse>('/evaluaciones/admin/modulos/')

  if (Array.isArray(data)) {
    return data
  }

  return Array.isArray(data.results) ? data.results : []
}

export const crearPregunta = async (payload: PreguntaPayload | FormData): Promise<Pregunta> => {
  if (payload instanceof FormData) {
    const { data } = await axiosInstance.post<Pregunta>('/evaluaciones/admin/preguntas/', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return normalizePregunta(data)
  }

  const apiPayload = mapPreguntaPayloadToApi(payload)
  const { data } = await axiosInstance.post<Pregunta>('/evaluaciones/admin/preguntas/', apiPayload)
  return normalizePregunta(data)
}

export const actualizarPregunta = async ({
  id,
  data,
}: {
  id: number | string
  data: PreguntaPayload | FormData
}): Promise<ActualizarPreguntaResult> => {
  const response =
    data instanceof FormData
      ? await axiosInstance.patch<ActualizarPreguntaApiResponse>(
          `/evaluaciones/admin/preguntas/${id}/`,
          data,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
      : await axiosInstance.patch<ActualizarPreguntaApiResponse>(
          `/evaluaciones/admin/preguntas/${id}/`,
          mapPreguntaPayloadToApi(data),
        )

  const esVersionada =
    response.status === 201 ||
    (typeof response.data === 'object' &&
      response.data !== null &&
      'nueva_pregunta' in response.data &&
      Boolean(response.data.nueva_pregunta))

  const preguntaRaw =
    typeof response.data === 'object' &&
    response.data !== null &&
    'nueva_pregunta' in response.data &&
    response.data.nueva_pregunta
      ? response.data.nueva_pregunta
      : (response.data as Pregunta)

  const mensaje =
    typeof response.data === 'object' && response.data !== null && 'mensaje' in response.data
      ? response.data.mensaje
      : undefined

  return {
    pregunta: normalizePregunta(preguntaRaw),
    versionada: esVersionada,
    mensaje,
    status: response.status,
  }
}

export const cambiarEstadoPregunta = async ({
  id,
  estado,
}: {
  id: number | string
  estado: string
}) => {
  const response = await axiosInstance.patch(`/evaluaciones/admin/preguntas/${id}/`, { estado })
  return response.data
}

export const bulkUpdateEstadoPreguntas = async ({
  ids,
  estado,
}: {
  ids: Array<number | string>
  estado: string
}): Promise<BulkUpdateEstadoPreguntasResponse> => {
  const { data } = await axiosInstance.patch<BulkUpdateEstadoPreguntasResponse>(
    '/evaluaciones/admin/preguntas/bulk-update-estado/',
    { ids, estado },
  )
  return data
}

export const eliminarPregunta = async (
  id: number | string,
): Promise<EliminarPreguntaResponse> => {
  const { data } = await axiosInstance.delete<EliminarPreguntaResponse>(
    `/evaluaciones/admin/preguntas/${id}/`,
  )
  return data ?? {}
}

export const generarOpcionesIA = async ({
  enunciado,
  contexto,
}: {
  enunciado: string
  contexto?: string
}): Promise<Array<{ texto: string; es_correcta: boolean }>> => {
  const { data } = await axiosInstance.post<GenerarOpcionesIAResponse>(
    '/evaluaciones/ia/generar-opciones/',
    {
      enunciado,
      contexto,
    },
  )

  const opciones = Array.isArray(data) ? data : Array.isArray(data.opciones) ? data.opciones : []

  return opciones.map((opcion) => ({
    texto: String(opcion.texto ?? '').trim(),
    es_correcta: Boolean(opcion.es_correcta),
  }))
}

export const previsualizarLatex = async (textoLatex: string): Promise<PreviewLatexResult> => {
  const { data } = await axiosInstance.post<PreviewLatexResponse>('/evaluaciones/ia/preview-latex/', {
    texto_latex: textoLatex,
  })

  const pdfBase64 = String(data?.pdf_base64 ?? '').trim()
  if (!pdfBase64) {
    throw new Error(String(data?.detalle ?? data?.detail ?? 'No se pudo generar la vista previa LaTeX.'))
  }

  return {
    pdfBase64,
    pngBase64: String(data?.preview_png_base64 ?? '').trim() || undefined,
  }
}

export const cargaMasivaPreguntas = async ({
  file,
  moduloId,
  categoriaId,
  competenciaId,
  usarIA = true,
}: {
  file: File
  moduloId?: number
  categoriaId?: number
  competenciaId?: number
  usarIA?: boolean
}): Promise<CargaMasivaPreguntasResponse> => {
  const formData = new FormData()
  formData.append('archivo', file)
  formData.append('usar_ia', usarIA ? 'true' : 'false')
  if (typeof moduloId === 'number') {
    formData.append('modulo_id', String(moduloId))
  }

  if (categoriaId) {
    formData.append('categoria_id', String(categoriaId))
  }

  if (competenciaId) {
    formData.append('competencia_id', String(competenciaId))
  }

  const { data } = await axiosInstance.post<CargaMasivaPreguntasResponse>(
    '/evaluaciones/admin/preguntas/carga-masiva/',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )

  return data
}

const getFilenameFromContentDisposition = (headerValue?: string): string | null => {
  const value = String(headerValue ?? '')
  if (!value) {
    return null
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).replace(/["']/g, '')
  }

  const filenameMatch = value.match(/filename="?([^"]+)"?/i)
  if (filenameMatch?.[1]) {
    return filenameMatch[1].trim()
  }

  return null
}

export const descargarPlantillaCargaMasivaPreguntas = async (
  moduloId?: number,
): Promise<PlantillaCargaMasivaDownload> => {
  const { data, headers } = await axiosInstance.get('/evaluaciones/admin/preguntas/plantilla-carga/', {
    params: typeof moduloId === 'number' ? { modulo_id: moduloId } : undefined,
    responseType: 'blob',
  })

  const filename =
    getFilenameFromContentDisposition(headers?.['content-disposition']) ??
    'plantilla_preguntas_generica.xlsx'

  return {
    blob: data as Blob,
    filename,
  }
}

export const revertirCargaMasiva = async (
  loteId: string,
): Promise<RevertirCargaMasivaResponse> => {
  const { data } = await axiosInstance.post<RevertirCargaMasivaResponse>(
    '/evaluaciones/admin/preguntas/revertir-carga/',
    { lote_id: loteId },
  )

  return data
}

export const getPreguntasCriticas = async ({
  umbral = 60,
  programaId,
  nivel,
  search,
}: {
  umbral?: number
  programaId?: number | ''
  nivel?: string
  search?: string
}): Promise<PreguntasCriticasResponse> => {
  const params = new URLSearchParams()
  params.set('umbral', String(umbral))
  if (typeof programaId === 'number') {
    params.set('programa_id', String(programaId))
  }
  if (nivel) {
    params.set('nivel', nivel)
  }
  if (search) {
    params.set('search', search)
  }

  const { data } = await axiosInstance.get<PreguntasCriticasResponse>(
    `/preguntas/criticas/?${params.toString()}`,
  )
  return {
    ...data,
    results: (data.results ?? []).map(normalizePregunta).map((pregunta) => ({
      ...pregunta,
      tasa_error: Number((pregunta as PreguntaCriticaRow).tasa_error ?? 0),
      total_respondidas: Number((pregunta as PreguntaCriticaRow).total_respondidas ?? 0),
      respuestas_incorrectas: Number((pregunta as PreguntaCriticaRow).respuestas_incorrectas ?? 0),
    })),
  }
}

const preguntasService = {
  getPreguntas,
  getPreguntaById,
  getModulos,
  crearPregunta,
  actualizarPregunta,
  cambiarEstadoPregunta,
  bulkUpdateEstadoPreguntas,
  eliminarPregunta,
  generarOpcionesIA,
  previsualizarLatex,
  cargaMasivaPreguntas,
  descargarPlantillaCargaMasivaPreguntas,
  revertirCargaMasiva,
  getPreguntasCriticas,
}

export default preguntasService
