import { useEffect, useMemo, useRef, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Grid2x2, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import RichTextRenderer from '../../../components/ui/RichTextRenderer'
import estudianteService from '../services/estudianteService'
import type { IntentoPrevio, RespuestaEstudiante } from '../../../types/evaluaciones'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

interface GuardarRespuestaVariables {
  respuestaId: string
  opcionId: string
}

type RespuestasLocalState = Record<string, string>
type ModulosCompletadosState = Record<string, boolean>

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/').replace(/\/+$/, '')
const backendOrigin = (() => {
  try {
    return new URL(apiBaseUrl).origin
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : ''
  }
})()

const resolveMediaUrl = (value?: string | null) => {
  if (!value) {
    return null
  }

  const raw = String(value).trim()
  if (!raw) {
    return null
  }

  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw
  }

  if (raw.startsWith('/')) {
    return `${backendOrigin}${raw}`
  }

  return `${backendOrigin}/${raw.replace(/^\/+/, '')}`
}

const hashString = (value: string) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return hash >>> 0
}

const sortOptionsDeterministically = <T extends { id: string }>(array: T[], seedBase: string): T[] => {
  return [...array].sort((a, b) => {
    const scoreA = hashString(`${seedBase}:${a.id}`)
    const scoreB = hashString(`${seedBase}:${b.id}`)
    if (scoreA === scoreB) {
      return a.id.localeCompare(b.id)
    }
    return scoreA - scoreB
  })
}

const PresentarExamenPage = () => {
  const { intentoId, moduloId } = useParams<{ intentoId: string; moduloId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [preguntaActivaIndex, setPreguntaActivaIndex] = useState(0)
  const [respuestasLocales, setRespuestasLocales] = useState<RespuestasLocalState>({})
  const [showRecoveredMessage, setShowRecoveredMessage] = useState(false)
  const [showQuestionMapMobile, setShowQuestionMapMobile] = useState(false)
  const hasAutoPositionedRef = useRef(false)
  const storageKey = intentoId ? `simulacro_estado_${intentoId}` : ''
  const modulosCompletadosKey = intentoId ? `simulacro_modulos_completados_${intentoId}` : ''

  useEffect(() => {
    setPreguntaActivaIndex(0)
    setShowQuestionMapMobile(false)
    hasAutoPositionedRef.current = false
  }, [intentoId, moduloId])

  useEffect(() => {
    if (!storageKey) {
      setRespuestasLocales({})
      setShowRecoveredMessage(false)
      return
    }

    const guardado = localStorage.getItem(storageKey)
    if (!guardado) {
      setRespuestasLocales({})
      setShowRecoveredMessage(false)
      return
    }

    try {
      const parsed = JSON.parse(guardado) as RespuestasLocalState
      if (parsed && typeof parsed === 'object') {
        setRespuestasLocales(parsed)
        if (Object.keys(parsed).length > 0) {
          setShowRecoveredMessage(true)
        }
      }
    } catch {
      localStorage.removeItem(storageKey)
      setRespuestasLocales({})
      setShowRecoveredMessage(false)
    }
  }, [storageKey])

  useEffect(() => {
    if (!showRecoveredMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowRecoveredMessage(false)
    }, 3500)

    return () => window.clearTimeout(timeoutId)
  }, [showRecoveredMessage])

  const {
    data: intentoData,
    isLoading: isLoadingIntento,
  } = useQuery<IntentoPrevio, AxiosError<ApiErrorResponse>>({
    queryKey: ['intento', intentoId],
    queryFn: () => estudianteService.getIntentoById(intentoId as string),
    enabled: Boolean(intentoId),
  })

  const {
    data: respuestas = [],
    isLoading,
    isError,
    error,
  } = useQuery<RespuestaEstudiante[], AxiosError<ApiErrorResponse>>({
    queryKey: ['respuestas', intentoId],
    queryFn: () => estudianteService.getRespuestasIntento(intentoId as string),
    enabled: Boolean(intentoId),
  })

  useEffect(() => {
    if (!intentoId || isLoadingIntento || !intentoData) {
      return
    }

    if (intentoData.estado !== 'En Progreso') {
      navigate(`/evaluaciones/intento/${intentoId}/resultados`, { replace: true })
    }
  }, [intentoData, intentoId, isLoadingIntento, navigate])

  useEffect(() => {
    if (!storageKey || respuestas.length === 0) {
      return
    }

    const desdeBackend: RespuestasLocalState = {}
    respuestas.forEach((respuesta) => {
      if (respuesta.opcion_seleccionada) {
        desdeBackend[respuesta.id] = respuesta.opcion_seleccionada
      }
    })

    if (Object.keys(desdeBackend).length === 0) {
      return
    }

    setRespuestasLocales((prev) => {
      const merged = { ...desdeBackend, ...prev }
      localStorage.setItem(storageKey, JSON.stringify(merged))
      return merged
    })
  }, [respuestas, storageKey])

  const respuestasModulo = useMemo(() => {
    if (!respuestas || !moduloId) {
      return []
    }

    const filtradas = respuestas.filter((r) => r.pregunta.modulo_id.toString() === moduloId)

    return filtradas.map((respuesta) => {
      const opcionesOriginales = respuesta.pregunta.opciones ? [...respuesta.pregunta.opciones] : []
      const seedBase = `${intentoId ?? ''}:${respuesta.id}`
      const opcionesMezcladas = sortOptionsDeterministically(opcionesOriginales, seedBase)

      return {
        ...respuesta,
        pregunta: {
          ...respuesta.pregunta,
          opciones: opcionesMezcladas,
        },
      }
    })
  }, [respuestas, moduloId, intentoId])

  const guardarRespuestaMutation = useMutation<
    void,
    AxiosError<ApiErrorResponse>,
    GuardarRespuestaVariables
  >({
    mutationFn: ({ respuestaId, opcionId }) =>
      estudianteService.guardarRespuesta(respuestaId, opcionId),
    onSuccess: async () => {
      if (!intentoId) {
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['respuestas', intentoId] })
    },
    onError: (mutationError) => {
      if (mutationError.response?.status === 409 && intentoId) {
        navigate(`/evaluaciones/intento/${intentoId}/resultados`, { replace: true })
      }
    },
  })

  const handleSeleccionarOpcion = (respuestaId: string, opcionId: string) => {
    if (intentoData?.estado && intentoData.estado !== 'En Progreso') {
      return
    }

    setRespuestasLocales((prev) => {
      const updated = { ...prev, [respuestaId]: opcionId }
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      }
      return updated
    })

    guardarRespuestaMutation.mutate({
      respuestaId,
      opcionId,
    })
  }

  useEffect(() => {
    if (respuestasModulo.length === 0) {
      setPreguntaActivaIndex(0)
      return
    }

    if (preguntaActivaIndex > respuestasModulo.length - 1) {
      setPreguntaActivaIndex(respuestasModulo.length - 1)
    }
  }, [preguntaActivaIndex, respuestasModulo.length])

  const respuestaActiva = useMemo(() => {
    return respuestasModulo[preguntaActivaIndex] ?? null
  }, [preguntaActivaIndex, respuestasModulo])
  const esUltimaPregunta = preguntaActivaIndex === respuestasModulo.length - 1
  const moduloCompleto = useMemo(
    () =>
      respuestasModulo.length > 0 &&
      respuestasModulo.every((respuesta) => {
        const seleccion = respuestasLocales[respuesta.id] ?? respuesta.opcion_seleccionada
        return Boolean(seleccion)
      }),
    [respuestasLocales, respuestasModulo],
  )
  const preguntasPendientes = useMemo(
    () =>
      respuestasModulo.reduce((acc, respuesta) => {
        const seleccion = respuestasLocales[respuesta.id] ?? respuesta.opcion_seleccionada
        return seleccion ? acc : acc + 1
      }, 0),
    [respuestasLocales, respuestasModulo],
  )

  useEffect(() => {
    if (respuestasModulo.length === 0 || hasAutoPositionedRef.current) {
      return
    }

    const primerPendiente = respuestasModulo.findIndex((respuesta) => {
      const seleccion = respuestasLocales[respuesta.id] ?? respuesta.opcion_seleccionada
      return !seleccion
    })

    if (primerPendiente >= 0) {
      setPreguntaActivaIndex(primerPendiente)
    } else {
      setPreguntaActivaIndex(respuestasModulo.length - 1)
    }

    hasAutoPositionedRef.current = true
  }, [respuestasLocales, respuestasModulo])

  const handleFinalizarModulo = () => {
    if (!intentoId || !moduloId || !moduloCompleto) {
      return
    }

    let parsed: ModulosCompletadosState = {}
    const raw = localStorage.getItem(modulosCompletadosKey)
    if (raw) {
      try {
        parsed = JSON.parse(raw) as ModulosCompletadosState
      } catch {
        parsed = {}
      }
    }

    const updated = { ...parsed, [moduloId]: true }
    localStorage.setItem(modulosCompletadosKey, JSON.stringify(updated))
    navigate(`/evaluaciones/intento/${intentoId}`)
  }

  const queryErrorMessage =
    error?.response?.data?.detalle ??
    error?.response?.data?.detail ??
    'No fue posible cargar las preguntas del examen.'
  const guardarErrorMessage =
    guardarRespuestaMutation.error?.response?.data?.detalle ??
    guardarRespuestaMutation.error?.response?.data?.detail ??
    'No se pudo guardar tu respuesta.'
  const isIntentoEditable = intentoData?.estado === 'En Progreso'

  if (!intentoId || !moduloId) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-usco-fondo p-6">
        <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
          Parámetros de intento o módulo no válidos.
        </div>
      </main>
    )
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-usco-fondo">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[18rem_1fr]">
        <aside className="hidden border-b border-usco-ocre/80 bg-white p-5 lg:block lg:border-b-0 lg:border-r">
          <h1 className="text-xl font-bold text-usco-vino">Preguntas del Módulo</h1>
          <p className="mt-1 text-sm text-usco-gris">
            Navega y responde cada pregunta del módulo seleccionado.
          </p>

          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-4">
            {respuestasModulo.map((respuesta, index) => {
              const isActive = index === preguntaActivaIndex
              const opcionSeleccionada = respuestasLocales[respuesta.id] ?? respuesta.opcion_seleccionada
              const isAnswered = opcionSeleccionada !== null

              return (
                <button
                  key={respuesta.id}
                  type="button"
                  onClick={() => setPreguntaActivaIndex(index)}
                  className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                    isAnswered ? 'bg-usco-vino text-white' : 'bg-gray-200 text-gray-700'
                  } ${isActive ? 'ring-2 ring-usco-ocre ring-offset-2 ring-offset-white' : ''}`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="border-b border-usco-ocre/80 bg-white px-6 py-4">
            <button
              type="button"
              onClick={() => navigate(`/evaluaciones/intento/${intentoId}`)}
              className="rounded-lg border border-usco-gris/30 bg-white px-3 py-1.5 text-xs font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
            >
              Volver a los Módulos
            </button>
            <h2 className="mt-3 text-lg font-semibold text-usco-vino">
              Módulo: {respuestaActiva?.pregunta.modulo_nombre ?? moduloId}
            </h2>
            <p className="mt-1 text-sm text-usco-gris">
              Pregunta {preguntaActivaIndex + 1} de {respuestasModulo.length}
            </p>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {(isLoading || isLoadingIntento) && (
              <div className="rounded-xl border border-usco-ocre/80 bg-white p-6 shadow-sm">
                <SaberProLoader mensaje="Cargando tu examen..." />
              </div>
            )}

            {!isLoading && !isLoadingIntento && !isError && showRecoveredMessage && (
              <div className="mb-4 rounded-xl border border-usco-ocre/90 bg-usco-fondo p-4 text-sm text-usco-vino">
                Respuestas recuperadas desde tu sesión anterior.
              </div>
            )}

            {!isLoading && !isLoadingIntento && !isError && !isIntentoEditable && (
              <div className="mb-4 rounded-xl border border-usco-ocre/80 bg-usco-fondo p-4 text-sm text-usco-gris">
                Este intento ya fue finalizado. Redirigiendo a resultados...
              </div>
            )}

            {isError && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
                {queryErrorMessage}
              </div>
            )}

            {!isLoading && !isLoadingIntento && !isError && respuestasModulo.length === 0 && (
              <div className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
                Este módulo no tiene preguntas asignadas en el intento.
              </div>
            )}

            {!isLoading && !isLoadingIntento && !isError && respuestaActiva && (
              <article className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
                {respuestaActiva.pregunta.contexto_texto && (
                  <div className="rounded-lg border-l-4 border-usco-gris bg-gray-50 p-4 text-sm text-usco-gris">
                    <RichTextRenderer content={respuestaActiva.pregunta.contexto_texto} />
                  </div>
                )}

                {respuestaActiva.pregunta.contexto_imagen && (
                  <img
                    src={resolveMediaUrl(respuestaActiva.pregunta.contexto_imagen) ?? undefined}
                    alt="Contexto de la pregunta"
                    className="max-h-72 w-full rounded-lg object-contain"
                  />
                )}

                {respuestaActiva.pregunta.imagen_grafica && (
                  <img
                    src={resolveMediaUrl(respuestaActiva.pregunta.imagen_grafica) ?? undefined}
                    alt="Grafica de la pregunta"
                    className="max-h-80 w-full rounded-lg border border-usco-ocre/80 bg-white object-contain p-2"
                  />
                )}

                {(respuestaActiva.pregunta.soporte_multimedia === 'LATEX' ||
                  (!respuestaActiva.pregunta.soporte_multimedia &&
                    Boolean(respuestaActiva.pregunta.codigo_latex))) &&
                  respuestaActiva.pregunta.codigo_latex && (
                    <div className="rounded-lg border border-usco-ocre/80 bg-usco-fondo p-4">
                      <RichTextRenderer
                        content={respuestaActiva.pregunta.codigo_latex}
                        className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                      />
                    </div>
                  )}

                <div className="mb-6 text-lg font-medium text-gray-800">
                  <RichTextRenderer
                    content={respuestaActiva.pregunta.enunciado}
                    className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  />
                </div>

                <div className="space-y-3">
                  {respuestaActiva.pregunta.opciones.map((opcion, index) => {
                    const opcionSeleccionadaActual =
                      respuestasLocales[respuestaActiva.id] ?? respuestaActiva.opcion_seleccionada
                    const isSelected = opcion.id === opcionSeleccionadaActual
                    const isSavingCurrentAnswer =
                      guardarRespuestaMutation.isPending &&
                      guardarRespuestaMutation.variables?.respuestaId === respuestaActiva.id
                    const optionLetter = String.fromCharCode(65 + index)

                    return (
                      <button
                        key={opcion.id}
                        type="button"
                        onClick={() => handleSeleccionarOpcion(respuestaActiva.id, opcion.id)}
                        disabled={isSavingCurrentAnswer || !isIntentoEditable}
                        className={`w-full rounded-lg border p-4 text-left transition ${
                          isSelected
                            ? 'border-usco-vino bg-red-50 text-usco-vino'
                            : 'border-gray-200 bg-white text-usco-gris hover:border-usco-ocre'
                        } ${isSavingCurrentAnswer || !isIntentoEditable ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-usco-ocre/80 bg-usco-fondo text-xs font-bold text-usco-gris">
                            {optionLetter}
                          </span>
                          <span
                            className={`mt-1 inline-flex h-4 w-4 rounded-full border ${
                              isSelected ? 'border-usco-vino bg-usco-vino' : 'border-gray-400'
                            }`}
                          />
                          <div className="flex-1">
                            <RichTextRenderer
                              content={opcion.texto}
                              className="text-sm font-medium [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                            />
                            {opcion.imagen && (
                              <img
                                src={resolveMediaUrl(opcion.imagen) ?? undefined}
                                alt="Recurso de la opción"
                                className="mt-3 max-h-40 rounded-md object-contain"
                              />
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {guardarRespuestaMutation.isError && (
                  <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                    {guardarErrorMessage}
                  </p>
                )}
              </article>
            )}
          </div>

          <footer className="border-t border-usco-ocre/80 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setPreguntaActivaIndex((previousIndex) => Math.max(0, previousIndex - 1))
                }
                disabled={preguntaActivaIndex === 0 || respuestasModulo.length === 0}
                className="rounded-lg border border-usco-gris/30 bg-white px-4 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>

              {esUltimaPregunta ? (
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={handleFinalizarModulo}
                    disabled={!moduloCompleto}
                    title={
                      moduloCompleto
                        ? 'Módulo completo'
                        : 'Debes responder todas las preguntas del módulo'
                    }
                    className="rounded bg-usco-vino px-6 py-2 font-medium text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Finalizar Módulo
                  </button>
                  {!moduloCompleto && (
                    <p className="text-xs font-medium text-usco-gris">
                      Te faltan {preguntasPendientes} pregunta(s) por responder.
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPreguntaActivaIndex((i) => i + 1)}
                  disabled={respuestasModulo.length === 0}
                  className="rounded-lg bg-usco-vino px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Siguiente
                </button>
              )}
            </div>
          </footer>
        </section>
      </div>

      {!showQuestionMapMobile && (
        <button
          type="button"
          onClick={() => setShowQuestionMapMobile(true)}
          className="fixed right-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-usco-vino text-white shadow-lg transition hover:bg-red-900 lg:hidden bottom-[calc(env(safe-area-inset-bottom)+6.25rem)]"
          aria-label="Abrir mapa de preguntas"
        >
          <Grid2x2 className="h-5 w-5" />
        </button>
      )}

      {showQuestionMapMobile && (
        <div className="fixed inset-0 z-40 bg-black/45 lg:hidden">
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-usco-vino">Mapa de preguntas</h2>
              <button
                type="button"
                onClick={() => setShowQuestionMapMobile(false)}
                className="rounded-md p-1 text-usco-gris transition hover:bg-usco-fondo hover:text-usco-vino"
                aria-label="Cerrar mapa de preguntas"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {respuestasModulo.map((respuesta, index) => {
                const isActive = index === preguntaActivaIndex
                const opcionSeleccionada = respuestasLocales[respuesta.id] ?? respuesta.opcion_seleccionada
                const isAnswered = opcionSeleccionada !== null

                return (
                  <button
                    key={`mobile-${respuesta.id}`}
                    type="button"
                    onClick={() => {
                      setPreguntaActivaIndex(index)
                      setShowQuestionMapMobile(false)
                    }}
                    className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                      isAnswered ? 'bg-usco-vino text-white' : 'bg-gray-200 text-gray-700'
                    } ${isActive ? 'ring-2 ring-usco-ocre ring-offset-2 ring-offset-white' : ''}`}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default PresentarExamenPage
