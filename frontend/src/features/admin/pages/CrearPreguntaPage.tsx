import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import especificacionesService from '../services/especificacionesService'
import preguntasService from '../services/preguntasService'
import KaTeXPreview from '../../../components/ui/KaTeXPreview'
import type { Categoria, Competencia } from '../../../types/evaluaciones'
import type { Modulo } from '../../../types/preguntas'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
  error?: string
  detalle_tecnico?: string
  [key: string]: unknown
}

interface OpcionForm {
  texto: string
  es_correcta: boolean
  imagen: File | null
  previewUrl: string | null
}

const CrearPreguntaPage = () => {
  const navigate = useNavigate()

  const [moduloId, setModuloId] = useState<number | ''>('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [competenciaId, setCompetenciaId] = useState<number | ''>('')
  const [tipoPregunta, setTipoPregunta] = useState<'Opcion Multiple' | 'Ensayo'>('Opcion Multiple')
  const [formatoOpciones, setFormatoOpciones] = useState<'texto' | 'imagen'>('texto')
  const [dificultad, setDificultad] = useState<'Facil' | 'Media' | 'Alta'>('Media')
  const [estado, setEstado] = useState<'Borrador' | 'Publicada'>('Borrador')
  const [enunciado, setEnunciado] = useState('')
  const [contextoTexto, setContextoTexto] = useState('')
  const [soporteMultimedia, setSoporteMultimedia] = useState<'NINGUNO' | 'IMAGEN' | 'LATEX'>(
    'NINGUNO',
  )
  const [imagenGrafica, setImagenGrafica] = useState<File | null>(null)
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
  const [isGeneratingIA, setIsGeneratingIA] = useState(false)

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

  useEffect(() => {
    if (moduloId === '' && modulos && modulos.length > 0) {
      setModuloId(Number(modulos[0].id))
    }
  }, [modulos, moduloId])

  useEffect(() => {
    setCategoriaId('')
    setCompetenciaId('')
  }, [moduloId])

  useEffect(() => {
    return () => {
      if (imagenGraficaPreview) {
        URL.revokeObjectURL(imagenGraficaPreview)
      }
    }
  }, [imagenGraficaPreview])

  const crearPreguntaMutation = useMutation({
    mutationFn: preguntasService.crearPregunta,
    onSuccess: () => {
      navigate('/preguntas', {
        state: { successMessage: 'Pregunta creada correctamente.' },
      })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      const responseData = error.response?.data
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

      setFormError('No fue posible crear la pregunta.')
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
          imagen: file,
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

    if (soporteMultimedia === 'IMAGEN' && !(imagenGrafica instanceof File)) {
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

      if (formatoOpciones === 'imagen' && opcionesValidas.some((opcion) => !(opcion.imagen instanceof File))) {
        return 'Todas las opciones deben tener una imagen.'
      }

      if (!opcionesValidas.some((opcion) => opcion.es_correcta)) {
        return 'Debes marcar una opcion correcta.'
      }

      if (formatoOpciones === 'texto') {
        const seen = new Set<string>()
        for (const opcion of opcionesValidas) {
          const key = opcion.texto.trim().toLowerCase().replace(/\s+/g, ' ')
          if (!key) continue
          if (seen.has(key)) {
            return 'No se permiten opciones de respuesta repetidas.'
          }
          seen.add(key)
        }
      }
    }

    return null
  }

  const handleGenerarOpcionesIA = async () => {
    if (!enunciado.trim()) {
      setFormError('Escribe primero el enunciado para generar opciones con IA.')
      return
    }

    setFormError('')
    setIsGeneratingIA(true)

    try {
      const opcionesIA = await preguntasService.generarOpcionesIA({
        enunciado: enunciado.trim(),
        contexto: contextoTexto.trim(),
      })

      if (!opcionesIA.length) {
        setFormError('La IA no devolvio opciones. Intenta nuevamente.')
        return
      }

      const opcionesLimpias = opcionesIA
        .filter((opcion) => opcion.texto.trim().length > 0)
        .slice(0, 4)
        .map((opcion) => ({
          texto: opcion.texto,
          es_correcta: opcion.es_correcta,
          imagen: null,
          previewUrl: null,
        }))

      if (!opcionesLimpias.length) {
        setFormError('La IA devolvio opciones vacias. Intenta nuevamente.')
        return
      }

      if (!opcionesLimpias.some((opcion) => opcion.es_correcta)) {
        opcionesLimpias[0].es_correcta = true
      }

      if (opcionesLimpias.filter((opcion) => opcion.es_correcta).length > 1) {
        opcionesLimpias.forEach((opcion, index) => {
          opcion.es_correcta = index === 0
        })
      }

      while (opcionesLimpias.length < 2) {
        opcionesLimpias.push({
          texto: '',
          es_correcta: false,
          imagen: null,
          previewUrl: null,
        })
      }

      setOpciones(opcionesLimpias)
    } catch {
      setFormError('No fue posible generar opciones con IA en este momento.')
    } finally {
      setIsGeneratingIA(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    const validationError = validarFormulario()
    if (validationError) {
      setFormError(validationError)
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

    if (contextoTexto.trim()) {
      formData.append('contexto_texto', contextoTexto.trim())
    }

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

    crearPreguntaMutation.mutate(formData)
  }

  return (
    <section className="bank-scope mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate('/preguntas')}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-usco-gris/30 px-3 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <h1 className="text-2xl font-bold text-usco-vino">Crear Nueva Pregunta</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-usco-ocre/80 bg-white p-5 shadow-sm">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Módulo</span>
              <select
                value={moduloId}
                onChange={(event) => setModuloId(Number(event.target.value))}
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
                onChange={(event) => setEstado(event.target.value as 'Borrador' | 'Publicada')}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
              >
                <option value="Borrador">✎ Borrador (No saldra en examenes)</option>
                <option value="Publicada">✓ Publicada (Lista para usar)</option>
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
                  {imagenGraficaPreview && (
                    <img
                      src={imagenGraficaPreview}
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
                        name="formato-opciones"
                        checked={formatoOpciones === 'texto'}
                        onChange={() => setFormatoOpciones('texto')}
                        className="h-4 w-4 text-usco-vino focus:ring-usco-vino"
                      />
                      Opciones en Texto
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="formato-opciones"
                        checked={formatoOpciones === 'imagen'}
                        onChange={() => setFormatoOpciones('imagen')}
                        className="h-4 w-4 text-usco-vino focus:ring-usco-vino"
                      />
                      Opciones con Imagen
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-usco-gris">Opciones de Respuesta</p>
                  <button
                    type="button"
                    onClick={handleGenerarOpcionesIA}
                    disabled={isGeneratingIA || formatoOpciones === 'imagen'}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-usco-vino/35 bg-usco-ocre px-3 py-2 text-xs font-bold text-usco-vino transition hover:bg-[#f0e8bf] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4" />
                    {formatoOpciones === 'imagen'
                      ? 'IA disponible solo para texto'
                      : isGeneratingIA
                        ? 'Generando...'
                        : 'Generar Opciones con IA'}
                  </button>
                </div>
                {opciones.map((opcion, index) => (
                  <div
                    key={`opcion-${index}`}
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
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            actualizarImagenOpcion(index, event.target.files?.[0] ?? null)
                          }
                          className="w-full rounded border border-gray-300 p-2 text-xs text-usco-gris file:mr-2 file:rounded file:border-0 file:bg-usco-vino file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white"
                        />
                        {opcion.previewUrl && (
                          <img
                            src={opcion.previewUrl}
                            alt={`Preview opcion ${index + 1}`}
                            className="h-28 w-full rounded border border-gray-200 object-contain bg-gray-50"
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
                ))}

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
          disabled={crearPreguntaMutation.isPending}
          className="w-full rounded-xl bg-usco-vino p-3 text-base font-semibold text-white shadow transition hover:bg-[#741017] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {crearPreguntaMutation.isPending ? 'Guardando...' : 'Guardar Pregunta'}
        </button>
      </form>
    </section>
  )
}

export default CrearPreguntaPage
