import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import especificacionesService from '../services/especificacionesService'
import preguntasService from '../services/preguntasService'
import type { ActualizarPreguntaResult } from '../services/preguntasService'
import KaTeXPreview from '../../../components/ui/KaTeXPreview'
import type { Categoria, Competencia } from '../../../types/evaluaciones'
import type { Modulo, Pregunta } from '../../../types/preguntas'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
  error?: string
  detalle_tecnico?: string
  [key: string]: unknown
}

interface OpcionForm {
  id?: string | number
  texto: string
  es_correcta: boolean
  imagen: File | string | null
  previewUrl: string | null
}

interface EditarPreguntaLocationState {
  fromCarousel?: boolean
}

const CAROUSEL_NOTIFICATION_STORAGE_KEY = 'preguntas_carousel_notification'

const mapDificultadFromPregunta = (dificultad: string): 'Facil' | 'Media' | 'Alta' => {
  if (dificultad === 'Facil') {
    return 'Facil'
  }

  if (dificultad === 'Alta' || dificultad === 'Dificil') {
    return 'Alta'
  }

  return 'Media'
}

const resolveModuloId = (pregunta: Pregunta): number | '' => {
  if (typeof pregunta.modulo === 'object' && pregunta.modulo !== null) {
    return Number((pregunta.modulo as Modulo).id)
  }

  if (typeof pregunta.modulo === 'number' || typeof pregunta.modulo === 'string') {
    const value = Number(pregunta.modulo)
    return Number.isFinite(value) ? value : ''
  }

  if (pregunta.modulo_id) {
    return Number(pregunta.modulo_id)
  }

  return ''
}

const getModuloNombre = (pregunta: Pregunta): string => {
  if (pregunta.modulo_nombre) {
    return pregunta.modulo_nombre
  }

  if (typeof pregunta.modulo === 'object' && pregunta.modulo !== null) {
    return (pregunta.modulo as Modulo).nombre
  }

  return 'General'
}

const getBackendOrigin = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/'

  try {
    return new URL(apiUrl).origin
  } catch {
    return 'http://localhost:8000'
  }
}

const EditarPreguntaPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { preguntaId } = useParams()
  const backendOrigin = useMemo(() => getBackendOrigin(), [])
  const locationState = (location.state as EditarPreguntaLocationState | null) ?? null
  const fromCarousel = Boolean(locationState?.fromCarousel)

  const [moduloId, setModuloId] = useState<number | ''>('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [competenciaId, setCompetenciaId] = useState<number | ''>('')
  const [tipoPregunta, setTipoPregunta] = useState<'Opcion Multiple' | 'Ensayo'>('Opcion Multiple')
  const [formatoOpciones, setFormatoOpciones] = useState<'texto' | 'imagen'>('texto')
  const [dificultad, setDificultad] = useState<'Facil' | 'Media' | 'Alta'>('Media')
  const [estado, setEstado] = useState<'Borrador' | 'Publicada' | 'Archivada'>('Borrador')
  const [enunciado, setEnunciado] = useState('')
  const [contextoTexto, setContextoTexto] = useState('')
  const [soporteMultimedia, setSoporteMultimedia] = useState<'NINGUNO' | 'IMAGEN' | 'LATEX'>(
    'NINGUNO',
  )
  const [imagenGrafica, setImagenGrafica] = useState<File | string | null>(null)
  const [imagenGraficaPreview, setImagenGraficaPreview] = useState<string | null>(null)
  const [codigoLatex, setCodigoLatex] = useState('')
  const [previewPdf, setPreviewPdf] = useState('')
  const [previewPng, setPreviewPng] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [limitePalabras, setLimitePalabras] = useState<number>(300)
  const [opciones, setOpciones] = useState<OpcionForm[]>([
    { texto: '', es_correcta: true, imagen: null, previewUrl: null },
    { texto: '', es_correcta: false, imagen: null, previewUrl: null },
  ])
  const [formError, setFormError] = useState('')
  const [initialized, setInitialized] = useState(false)

  const buildModuloRoute = () => {
    const moduloSeleccionado = (modulos ?? []).find((modulo) => Number(modulo.id) === Number(moduloId))
    const fallbackModulo = pregunta ? getModuloNombre(pregunta) : 'General'
    const moduloNombre = moduloSeleccionado?.nombre ?? fallbackModulo
    return `/preguntas/modulo/${encodeURIComponent(moduloNombre)}`
  }

  const volverSegunOrigen = (
    notification?: { type: 'success' | 'info'; message: string },
  ) => {
    if (fromCarousel) {
      if (notification && typeof window !== 'undefined') {
        window.sessionStorage.setItem(CAROUSEL_NOTIFICATION_STORAGE_KEY, JSON.stringify(notification))
      }
      navigate(-1)
      return
    }

    navigate(buildModuloRoute(), notification ? { state: { notification } } : undefined)
  }

  const { data: modulos, isLoading: cargandoModulos } = useQuery<Modulo[], AxiosError<ApiErrorResponse>>({
    queryKey: ['modulos'],
    queryFn: preguntasService.getModulos,
  })

  const { data: categorias } = useQuery<Categoria[], AxiosError<ApiErrorResponse>>({
    queryKey: ['categorias', moduloId],
    queryFn: () => especificacionesService.getCategorias(Number(moduloId)),
    enabled: Boolean(moduloId),
  })

  const { data: competencias } = useQuery<Competencia[], AxiosError<ApiErrorResponse>>({
    queryKey: ['competencias', moduloId],
    queryFn: () => especificacionesService.getCompetencias(Number(moduloId)),
    enabled: Boolean(moduloId),
  })

  const {
    data: pregunta,
    isLoading,
    isError,
    error,
  } = useQuery<Pregunta, AxiosError<ApiErrorResponse>>({
    queryKey: ['pregunta', preguntaId],
    queryFn: () => preguntasService.getPreguntaById(String(preguntaId)),
    enabled: Boolean(preguntaId),
  })

  useEffect(() => {
    if (!pregunta || initialized) {
      return
    }

    setModuloId(resolveModuloId(pregunta))
    setCategoriaId(
      typeof pregunta.categoria_id === 'number'
        ? pregunta.categoria_id
        : typeof pregunta.categoria === 'number'
          ? pregunta.categoria
          : '',
    )
    setCompetenciaId(
      typeof pregunta.competencia_id === 'number'
        ? pregunta.competencia_id
        : typeof pregunta.competencia === 'number'
          ? pregunta.competencia
          : '',
    )
    setTipoPregunta((pregunta.tipo_pregunta === 'Ensayo' ? 'Ensayo' : 'Opcion Multiple') as 'Ensayo' | 'Opcion Multiple')
    setDificultad(mapDificultadFromPregunta(String(pregunta.dificultad ?? 'Media')))
    setEstado(
      (pregunta.estado === 'Publicada'
        ? 'Publicada'
        : pregunta.estado === 'Archivada'
          ? 'Archivada'
          : 'Borrador') as 'Borrador' | 'Publicada' | 'Archivada',
    )
    setEnunciado(String(pregunta.enunciado ?? ''))
    setContextoTexto(String(pregunta.contexto_texto ?? ''))
    const soporteInicial = (
      pregunta.soporte_multimedia ??
      (pregunta.imagen_grafica ? 'IMAGEN' : pregunta.codigo_latex ? 'LATEX' : 'NINGUNO')
    ) as 'NINGUNO' | 'IMAGEN' | 'LATEX'
    setSoporteMultimedia(soporteInicial)
    setImagenGrafica(pregunta.imagen_grafica ?? null)
    setImagenGraficaPreview(null)
    setCodigoLatex(String(pregunta.codigo_latex ?? ''))
    setLimitePalabras(Number(pregunta.limite_palabras ?? 300))

    const tieneImagenes = (pregunta.opciones ?? []).some((opcion) => Boolean(opcion.imagen))
    setFormatoOpciones(tieneImagenes ? 'imagen' : 'texto')

    const opcionesMapeadas: OpcionForm[] = (pregunta.opciones ?? []).map((opcion) => ({
      id: opcion.id,
      texto: String(opcion.texto ?? ''),
      es_correcta: Boolean(opcion.es_correcta),
      imagen: opcion.imagen ?? null,
      previewUrl: null,
    }))

    if (opcionesMapeadas.length >= 2) {
      setOpciones(opcionesMapeadas)
    } else {
      setOpciones([
        opcionesMapeadas[0] ?? {
          texto: '',
          es_correcta: true,
          imagen: null,
          previewUrl: null,
        },
        opcionesMapeadas[1] ?? {
          texto: '',
          es_correcta: false,
          imagen: null,
          previewUrl: null,
        },
      ])
    }

    setInitialized(true)
  }, [pregunta, initialized])

  useEffect(() => {
    return () => {
      if (imagenGraficaPreview) {
        URL.revokeObjectURL(imagenGraficaPreview)
      }
    }
  }, [imagenGraficaPreview])

  const editarPreguntaMutation = useMutation({
    mutationFn: preguntasService.actualizarPregunta,
    onSuccess: (result: ActualizarPreguntaResult) => {
      queryClient.invalidateQueries({ queryKey: ['preguntas'] })
      queryClient.invalidateQueries({ queryKey: ['pregunta', preguntaId] })

      const versionadoMsg =
        'Esta pregunta ya habia sido respondida. Para proteger el historial, se guardo como una nueva version y la anterior fue archivada.'

      volverSegunOrigen({
        type: result.versionada ? 'info' : 'success',
        message: result.versionada ? versionadoMsg : 'Cambios guardados correctamente.',
      })
    },
    onError: (mutationError: AxiosError<ApiErrorResponse>) => {
      const responseData = mutationError.response?.data
      const detail = responseData?.detail ?? responseData?.detalle

      if (detail) {
        setFormError(String(detail))
        return
      }

      if (responseData && typeof responseData === 'object') {
        const firstFieldError = Object.values(responseData).find(
          (value) => Array.isArray(value) && value.length > 0,
        ) as string[] | undefined

        if (firstFieldError?.[0]) {
          setFormError(firstFieldError[0])
          return
        }
      }

      setFormError('No fue posible actualizar la pregunta.')
    },
  })

  const agregarOpcion = () => {
    setOpciones((current) => [
      ...current,
      { texto: '', es_correcta: false, imagen: null, previewUrl: null },
    ])
  }

  const eliminarOpcion = (index: number) => {
    setOpciones((current) => {
      const opcion = current[index]
      if (opcion?.previewUrl) {
        URL.revokeObjectURL(opcion.previewUrl)
      }
      return current.filter((_, currentIndex) => currentIndex !== index)
    })
  }

  const marcarCorrecta = (index: number) => {
    setOpciones((current) =>
      current.map((opcion, currentIndex) => ({
        ...opcion,
        es_correcta: currentIndex === index,
      })),
    )
  }

  const actualizarTextoOpcion = (index: number, texto: string) => {
    setOpciones((current) =>
      current.map((opcion, currentIndex) =>
        currentIndex === index
          ? {
              ...opcion,
              texto,
            }
          : opcion,
      ),
    )
  }

  const actualizarImagenOpcion = (index: number, file: File | null) => {
    setOpciones((current) =>
      current.map((opcion, currentIndex) => {
        if (currentIndex !== index) {
          return opcion
        }

        if (opcion.previewUrl) {
          URL.revokeObjectURL(opcion.previewUrl)
        }

        return {
          ...opcion,
          imagen: file ?? opcion.imagen,
          previewUrl: file ? URL.createObjectURL(file) : null,
        }
      }),
    )
  }

  const handleSoporteMultimediaChange = (value: 'NINGUNO' | 'IMAGEN' | 'LATEX') => {
    setSoporteMultimedia(value)

    if (value !== 'IMAGEN') {
      if (imagenGraficaPreview) {
        URL.revokeObjectURL(imagenGraficaPreview)
      }
      setImagenGrafica(null)
      setImagenGraficaPreview(null)
    }

    if (value !== 'LATEX') {
      setCodigoLatex('')
      setPreviewPdf('')
      setPreviewPng('')
      setPreviewError('')
    }
  }

  const actualizarImagenGrafica = (file: File | null) => {
    if (imagenGraficaPreview) {
      URL.revokeObjectURL(imagenGraficaPreview)
    }
    setImagenGrafica(file)
    setImagenGraficaPreview(file ? URL.createObjectURL(file) : null)
  }

  const handlePreviewLatex = async () => {
    const snippet = codigoLatex.trim()
    if (!snippet) {
      setPreviewPdf('')
      setPreviewPng('')
      setPreviewError('Escribe primero un fragmento LaTeX para previsualizar.')
      return
    }

    setIsLoadingPreview(true)
    setPreviewError('')

    try {
      const preview = await preguntasService.previsualizarLatex(snippet)
      setPreviewPdf(preview.pdfBase64)
      setPreviewPng(preview.pngBase64 ?? '')
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>
      const responseData = axiosError.response?.data
      const baseMessage =
        responseData?.detalle ??
        responseData?.detail ??
        responseData?.error ??
        'No fue posible compilar el codigo LaTeX.'
      const detalleTecnico = responseData?.detalle_tecnico
      setPreviewPdf('')
      setPreviewPng('')
      setPreviewError(
        detalleTecnico ? `${String(baseMessage)}\n${String(detalleTecnico)}` : String(baseMessage),
      )
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const getImagenPreview = (opcion: OpcionForm) => {
    if (opcion.previewUrl) {
      return opcion.previewUrl
    }

    if (typeof opcion.imagen === 'string' && opcion.imagen.trim()) {
      if (/^https?:\/\//i.test(opcion.imagen)) {
        return opcion.imagen
      }
      return `${backendOrigin}${opcion.imagen}`
    }

    return null
  }

  const getImagenGraficaPreview = () => {
    if (imagenGraficaPreview) {
      return imagenGraficaPreview
    }

    if (typeof imagenGrafica === 'string' && imagenGrafica.trim()) {
      if (/^https?:\/\//i.test(imagenGrafica)) {
        return imagenGrafica
      }
      return `${backendOrigin}${imagenGrafica}`
    }

    return null
  }

  const opcionesValidas = useMemo(
    () =>
      opciones.map((opcion) => ({
        ...opcion,
        texto: opcion.texto.trim(),
      })),
    [opciones],
  )

  const validarFormulario = (): string | null => {
    if (moduloId === '') {
      return 'Debes seleccionar un módulo.'
    }

    if (!enunciado.trim()) {
      return 'El enunciado es obligatorio.'
    }

    if (categoriaId === '') {
      return 'Debes seleccionar una categoría.'
    }

    if (competenciaId === '') {
      return 'Debes seleccionar una competencia.'
    }

    if (tipoPregunta === 'Ensayo' && (!limitePalabras || limitePalabras <= 0)) {
      return 'El limite de palabras debe ser mayor a 0.'
    }

    const tieneImagenGrafica = imagenGrafica instanceof File || typeof imagenGrafica === 'string'
    if (soporteMultimedia === 'IMAGEN' && !tieneImagenGrafica) {
      return 'Debes cargar una imagen grafica cuando el soporte multimedia es IMAGEN.'
    }

    if (soporteMultimedia === 'LATEX' && !codigoLatex.trim()) {
      return 'Debes escribir codigo LaTeX cuando el soporte multimedia es LATEX.'
    }

    if (tipoPregunta === 'Opcion Multiple') {
      if (opcionesValidas.length < 2) {
        return 'Debes agregar al menos dos opciones.'
      }

      if (formatoOpciones === 'texto' && opcionesValidas.some((opcion) => !opcion.texto)) {
        return 'Todas las opciones deben tener texto.'
      }

      if (
        formatoOpciones === 'imagen' &&
        opcionesValidas.some((opcion) => !(opcion.imagen instanceof File) && typeof opcion.imagen !== 'string')
      ) {
        return 'Todas las opciones deben tener una imagen.'
      }

      if (!opcionesValidas.some((opcion) => opcion.es_correcta)) {
        return 'Debes marcar una opcion correcta.'
      }
    }

    return null
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    const validationError = validarFormulario()
    if (validationError) {
      setFormError(validationError)
      return
    }

    if (!pregunta) {
      return
    }

    const normalizedCurrent = {
      enunciado: enunciado.trim(),
      contexto_texto: contextoTexto.trim(),
      soporte_multimedia: soporteMultimedia,
      codigo_latex: soporteMultimedia === 'LATEX' ? codigoLatex.trim() : '',
      imagen_grafica:
        soporteMultimedia === 'IMAGEN'
          ? imagenGrafica instanceof File
            ? `__new_file__${imagenGrafica.name}_${imagenGrafica.size}`
            : String(imagenGrafica ?? '')
          : '',
      tipo_pregunta: tipoPregunta,
      formato_opciones: formatoOpciones,
      dificultad,
      estado,
      modulo_id: Number(moduloId),
      categoria_id: categoriaId !== '' ? Number(categoriaId) : null,
      competencia_id: competenciaId !== '' ? Number(competenciaId) : null,
      limite_palabras: tipoPregunta === 'Ensayo' ? Number(limitePalabras ?? 0) : null,
      opciones:
        tipoPregunta === 'Opcion Multiple'
          ? opcionesValidas.map((opcion, index) => ({
              id: opcion.id ? String(opcion.id) : '',
              texto:
                formatoOpciones === 'imagen'
                  ? opcion.texto || `Opcion ${index + 1}`
                  : String(opcion.texto ?? '').trim(),
              es_correcta: Boolean(opcion.es_correcta),
              imagen:
                formatoOpciones === 'imagen'
                  ? opcion.imagen instanceof File
                    ? `__new_file__${opcion.imagen.name}_${opcion.imagen.size}`
                    : String(opcion.imagen ?? '')
                  : '',
            }))
          : [],
    }

    const originalFormato =
      (pregunta.opciones ?? []).some((opcion) => Boolean(opcion.imagen)) ? 'imagen' : 'texto'

    const normalizedOriginal = {
      enunciado: String(pregunta.enunciado ?? '').trim(),
      contexto_texto: String(pregunta.contexto_texto ?? '').trim(),
      soporte_multimedia:
        (pregunta.soporte_multimedia ??
          (pregunta.imagen_grafica ? 'IMAGEN' : pregunta.codigo_latex ? 'LATEX' : 'NINGUNO')) as
          | 'NINGUNO'
          | 'IMAGEN'
          | 'LATEX',
      codigo_latex:
        (pregunta.soporte_multimedia ??
          (pregunta.imagen_grafica ? 'IMAGEN' : pregunta.codigo_latex ? 'LATEX' : 'NINGUNO')) ===
        'LATEX'
          ? String(pregunta.codigo_latex ?? '').trim()
          : '',
      imagen_grafica:
        (pregunta.soporte_multimedia ??
          (pregunta.imagen_grafica ? 'IMAGEN' : pregunta.codigo_latex ? 'LATEX' : 'NINGUNO')) ===
        'IMAGEN'
          ? String(pregunta.imagen_grafica ?? '')
          : '',
      tipo_pregunta: pregunta.tipo_pregunta === 'Ensayo' ? 'Ensayo' : 'Opcion Multiple',
      formato_opciones: originalFormato,
      dificultad: mapDificultadFromPregunta(String(pregunta.dificultad ?? 'Media')),
      estado:
        pregunta.estado === 'Publicada'
          ? 'Publicada'
          : pregunta.estado === 'Archivada'
            ? 'Archivada'
            : 'Borrador',
      modulo_id: Number(resolveModuloId(pregunta)),
      categoria_id:
        typeof pregunta.categoria_id === 'number'
          ? pregunta.categoria_id
          : typeof pregunta.categoria === 'number'
            ? pregunta.categoria
            : null,
      competencia_id:
        typeof pregunta.competencia_id === 'number'
          ? pregunta.competencia_id
          : typeof pregunta.competencia === 'number'
            ? pregunta.competencia
            : null,
      limite_palabras:
        (pregunta.tipo_pregunta === 'Ensayo' ? Number(pregunta.limite_palabras ?? 0) : null),
      opciones:
        pregunta.tipo_pregunta === 'Ensayo'
          ? []
          : (pregunta.opciones ?? []).map((opcion, index) => ({
              id: String(opcion.id ?? ''),
              texto:
                originalFormato === 'imagen'
                  ? String(opcion.texto ?? '').trim() || `Opcion ${index + 1}`
                  : String(opcion.texto ?? '').trim(),
              es_correcta: Boolean(opcion.es_correcta),
              imagen: originalFormato === 'imagen' ? String(opcion.imagen ?? '') : '',
            })),
    }

    if (JSON.stringify(normalizedCurrent) === JSON.stringify(normalizedOriginal)) {
      volverSegunOrigen({ type: 'info', message: 'Sin cambios por guardar.' })
      return
    }

    const formData = new FormData()
    formData.append('enunciado', enunciado.trim())
    formData.append('tipo_pregunta', tipoPregunta)
    formData.append('dificultad', dificultad)
    formData.append('estado', estado)
    formData.append('modulo_id', String(Number(moduloId)))
    formData.append('categoria', String(Number(categoriaId)))
    formData.append('competencia', String(Number(competenciaId)))
    formData.append('contexto_texto', contextoTexto.trim())
    formData.append('soporte_multimedia', soporteMultimedia)
    if (soporteMultimedia === 'IMAGEN' && imagenGrafica instanceof File) {
      formData.append('imagen_grafica', imagenGrafica)
    }
    if (soporteMultimedia === 'LATEX' && codigoLatex.trim()) {
      formData.append('codigo_latex', codigoLatex.trim())
    }

    if (tipoPregunta === 'Ensayo') {
      formData.append('limite_palabras', String(limitePalabras))
    }

    if (tipoPregunta === 'Opcion Multiple') {
      opcionesValidas.forEach((opcion, index) => {
        if (opcion.id !== undefined && opcion.id !== null && String(opcion.id).trim()) {
          formData.append(`opciones[${index}][id]`, String(opcion.id))
        }

        formData.append(
          `opciones[${index}][texto]`,
          formatoOpciones === 'imagen' ? opcion.texto || `Opcion ${index + 1}` : opcion.texto,
        )
        formData.append(`opciones[${index}][es_correcta]`, String(opcion.es_correcta))

        if (formatoOpciones === 'imagen' && opcion.imagen instanceof File) {
          formData.append(`opciones[${index}][imagen]`, opcion.imagen)
        }
      })
    }

    editarPreguntaMutation.mutate({
      id: String(preguntaId),
      data: formData,
    })
  }

  if (!preguntaId) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        No se encontro el identificador de la pregunta.
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
        Cargando pregunta...
      </section>
    )
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error.response?.data?.detail ??
          error.response?.data?.detalle ??
          'No fue posible cargar la pregunta.'}
      </section>
    )
  }

  const handleModuloChange = (value: string) => {
    const moduloValue = value ? Number(value) : ''
    setModuloId(moduloValue)
    setCategoriaId('')
    setCompetenciaId('')
  }

  return (
    <section className="bank-scope mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => volverSegunOrigen()}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-usco-gris/30 px-3 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <h1 className="text-2xl font-bold text-usco-vino">Editar Pregunta</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-usco-ocre/80 bg-white p-5 shadow-sm">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Módulo</span>
              <select
                value={moduloId}
                onChange={(event) => handleModuloChange(event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                disabled={cargandoModulos}
                required
              >
                {cargandoModulos ? (
                  <option value="">Cargando módulos...</option>
                ) : (
                  <>
                    <option value="">Selecciona un módulo</option>
                    {(modulos ?? []).map((modulo) => (
                      <option key={modulo.id} value={modulo.id}>
                        {modulo.nombre}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">
                Categoría o Contenido
              </span>
              <select
                value={categoriaId}
                onChange={(event) => setCategoriaId(event.target.value ? Number(event.target.value) : '')}
                disabled={!moduloId || !(categorias?.length ?? 0)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15 disabled:bg-gray-100"
              >
                <option value="" disabled>
                  -- Selecciona una categoría --
                </option>
                {categorias?.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Competencia</span>
              <select
                value={competenciaId}
                onChange={(event) =>
                  setCompetenciaId(event.target.value ? Number(event.target.value) : '')
                }
                disabled={!moduloId || !(competencias?.length ?? 0)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15 disabled:bg-gray-100"
              >
                <option value="" disabled>
                  -- Selecciona una competencia --
                </option>
                {competencias?.map((competencia) => (
                  <option key={competencia.id} value={competencia.id}>
                    {competencia.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Tipo de Pregunta</span>
              <select
                value={tipoPregunta}
                onChange={(event) =>
                  setTipoPregunta(event.target.value as 'Opcion Multiple' | 'Ensayo')
                }
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              >
                <option value="Opcion Multiple">Opcion Multiple</option>
                <option value="Ensayo">Ensayo</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Dificultad</span>
              <select
                value={dificultad}
                onChange={(event) => setDificultad(event.target.value as 'Facil' | 'Media' | 'Alta')}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              >
                <option value="Facil">Facil</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">
                Estado de la Pregunta
              </span>
              <select
                value={estado}
                onChange={(event) =>
                  setEstado(event.target.value as 'Borrador' | 'Publicada' | 'Archivada')
                }
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
              >
                <option value="Borrador">Borrador (No saldra en examenes)</option>
                <option value="Publicada">Publicada (Lista para usar)</option>
                <option value="Archivada">Archivada</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Enunciado</span>
              <textarea
                value={enunciado}
                onChange={(event) => setEnunciado(event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              />
            </label>
            <KaTeXPreview text={enunciado} label="Vista previa del enunciado" />

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Contexto (Opcional)</span>
              <textarea
                value={contextoTexto}
                onChange={(event) => setContextoTexto(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
              />
            </label>
            <KaTeXPreview text={contextoTexto} label="Vista previa del contexto" />

            <div className="rounded-xl border border-usco-ocre/70 bg-usco-fondo p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-usco-gris">
                Contenido Multimedia
              </p>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-usco-gris">Soporte</span>
                <select
                  value={soporteMultimedia}
                  onChange={(event) =>
                    handleSoporteMultimediaChange(
                      event.target.value as 'NINGUNO' | 'IMAGEN' | 'LATEX',
                    )
                  }
                  className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                >
                  <option value="NINGUNO">Ninguno</option>
                  <option value="IMAGEN">Imagen</option>
                  <option value="LATEX">LaTeX</option>
                </select>
              </label>

              {soporteMultimedia === 'IMAGEN' && (
                <div className="mt-3 space-y-2">
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={(event) => actualizarImagenGrafica(event.target.files?.[0] ?? null)}
                    className="w-full rounded border border-gray-300 p-2 text-xs text-usco-gris file:mr-2 file:rounded file:border-0 file:bg-usco-vino file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white"
                  />
                  {getImagenGraficaPreview() && (
                    <img
                      src={getImagenGraficaPreview() ?? undefined}
                      alt="Vista previa de grafica"
                      className="max-h-52 w-full rounded border border-gray-200 bg-white object-contain"
                    />
                  )}
                </div>
              )}

              {soporteMultimedia === 'LATEX' && (
                <div className="mt-3 space-y-2">
                  <p className="rounded-lg border border-usco-ocre/70 bg-white p-2 text-xs text-usco-gris">
                    Pega unicamente el fragmento de codigo de la grafica o pregunta (por ejemplo:
                    <span className="font-semibold"> \begin{'{'}tikzpicture{'}'}...\end{'{'}tikzpicture{'}'} </span>
                    o <span className="font-semibold">\begin{'{'}pregunta{'}'}...\end{'{'}pregunta{'}'}</span>).
                    No incluyas <span className="font-semibold">\documentclass</span> ni
                    <span className="font-semibold"> \begin{'{'}document{'}'}</span>.
                  </p>
                  <textarea
                    value={codigoLatex}
                    onChange={(event) => {
                      setCodigoLatex(event.target.value)
                      setPreviewError('')
                    }}
                    rows={4}
                    placeholder="$\\frac{2}{1212}$"
                    className="w-full rounded border border-gray-300 p-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                  />
                  <button
                    type="button"
                    onClick={handlePreviewLatex}
                    disabled={isLoadingPreview}
                    className="inline-flex items-center rounded-lg border border-usco-vino/40 bg-white px-3 py-2 text-xs font-semibold text-usco-vino transition hover:bg-usco-vino/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingPreview ? 'Compilando...' : '⚡ Previsualizar LaTeX'}
                  </button>
                  {previewError && (
                    <div className="whitespace-pre-wrap rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-700">
                      {previewError}
                    </div>
                  )}
                  {previewPng ? (
                    <div className="overflow-hidden rounded-lg border border-usco-ocre/60 bg-white p-2">
                      <img
                        src={`data:image/png;base64,${previewPng}`}
                        alt="Vista previa LaTeX"
                        className="mx-auto max-h-64 w-auto object-contain"
                      />
                    </div>
                  ) : previewPdf ? (
                    <div className="overflow-hidden rounded-lg border border-usco-ocre/60 bg-white">
                      <iframe
                        title="Vista previa PDF LaTeX"
                        src={`data:application/pdf;base64,${previewPdf}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                        className="h-56 w-full"
                      />
                    </div>
                  ) : null}
                  <KaTeXPreview text={codigoLatex} label="Vista previa LaTeX" />
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-usco-ocre/80 bg-white p-5 shadow-sm">
            {tipoPregunta === 'Ensayo' ? (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-usco-gris">
                  Limite de Palabras
                </span>
                <input
                  type="number"
                  min={1}
                  value={limitePalabras}
                  onChange={(event) => setLimitePalabras(Number(event.target.value))}
                  className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                  required
                />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-usco-ocre/70 bg-usco-fondo p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-usco-gris">
                    Formato de Opciones
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="formato-opciones-editar"
                        checked={formatoOpciones === 'texto'}
                        onChange={() => setFormatoOpciones('texto')}
                        className="h-4 w-4 text-usco-vino focus:ring-usco-vino"
                      />
                      Opciones en Texto
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="formato-opciones-editar"
                        checked={formatoOpciones === 'imagen'}
                        onChange={() => setFormatoOpciones('imagen')}
                        className="h-4 w-4 text-usco-vino focus:ring-usco-vino"
                      />
                      Opciones con Imagen
                    </label>
                  </div>
                </div>

                <p className="text-sm font-semibold text-usco-gris">Opciones de Respuesta</p>

                {opciones.map((opcion, index) => {
                  const imagenPreview = getImagenPreview(opcion)
                  return (
                    <div
                      key={`opcion-${opcion.id ?? index}`}
                      className="mb-3 flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-sm"
                    >
                      {formatoOpciones === 'texto' ? (
                        <div className="flex-1 space-y-2">
                          <textarea
                            value={opcion.texto}
                            onChange={(event) => actualizarTextoOpcion(index, event.target.value)}
                            className="min-h-[80px] w-full resize-y rounded border border-gray-300 p-2 text-sm text-usco-gris focus:border-usco-vino focus:ring-usco-vino"
                            placeholder={`Texto de la opcion ${index + 1}`}
                          />
                          <KaTeXPreview
                            text={opcion.texto}
                            label={`Vista previa opcion ${index + 1}`}
                            className="bg-white"
                          />
                        </div>
                      ) : (
                        <div className="flex w-full flex-1 flex-col gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              actualizarImagenOpcion(index, event.target.files?.[0] ?? null)
                            }
                            className="text-sm"
                          />
                          {imagenPreview && (
                            <img
                              src={imagenPreview}
                              alt={`Preview opcion ${index + 1}`}
                              className="h-20 w-auto rounded border object-contain"
                            />
                          )}
                        </div>
                      )}

                      <div className="flex flex-col items-center gap-3 pt-1">
                        <label className="flex cursor-pointer items-center gap-1 text-sm font-medium text-gray-700">
                          <input
                            type="radio"
                            name="opcion_correcta"
                            checked={opcion.es_correcta}
                            onChange={() => marcarCorrecta(index)}
                            className="h-4 w-4 text-usco-vino focus:ring-usco-vino"
                          />
                          Correcta
                        </label>

                        <button
                          type="button"
                          onClick={() => eliminarOpcion(index)}
                          disabled={opciones.length <= 2}
                          className="p-1 text-red-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Eliminar opcion"
                          aria-label="Eliminar opcion"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={agregarOpcion}
                  className="inline-flex items-center gap-2 rounded-xl border border-usco-vino/40 px-3 py-2 text-sm font-semibold text-usco-vino transition hover:bg-usco-vino/5"
                >
                  <Plus className="h-4 w-4" />
                  Anadir Opcion
                </button>
              </div>
            )}
          </section>
        </div>

        {formError && (
          <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {formError}
          </section>
        )}

        <button
          type="submit"
          disabled={editarPreguntaMutation.isPending}
          className="w-full rounded-xl bg-usco-vino p-3 text-base font-semibold text-white shadow transition hover:bg-[#741017] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {editarPreguntaMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </section>
  )
}

export default EditarPreguntaPage
