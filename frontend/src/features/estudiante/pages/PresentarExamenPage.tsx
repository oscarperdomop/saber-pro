import { useEffect, useMemo, useRef, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import RichTextRenderer from '../../../components/ui/RichTextRenderer'
import estudianteService from '../services/estudianteService'
import type { RespuestaEstudiante } from '../../../types/evaluaciones'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

interface GuardarRespuestaVariables {
  respuestaId: string
  opcionId: string
}

type RespuestasLocalState = Record<string, string>

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

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

const PresentarExamenPage = () => {
  const { intentoId, moduloId } = useParams<{ intentoId: string; moduloId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [preguntaActivaIndex, setPreguntaActivaIndex] = useState(0)
  const [respuestasLocales, setRespuestasLocales] = useState<RespuestasLocalState>({})
  const [showRecoveredMessage, setShowRecoveredMessage] = useState(false)
  const opcionesPorRespuestaRef = useRef<Record<string, string[]>>({})
  const storageKey = intentoId ? `simulacro_estado_${intentoId}` : ''

  useEffect(() => {
    setPreguntaActivaIndex(0)
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
    opcionesPorRespuestaRef.current = {}
  }, [moduloId, intentoId])

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
      const ordenGuardado = opcionesPorRespuestaRef.current[respuesta.id]

      let opcionesMezcladas = opcionesOriginales

      if (ordenGuardado && ordenGuardado.length === opcionesOriginales.length) {
        const opcionesPorId = new Map(opcionesOriginales.map((opcion) => [opcion.id, opcion]))
        const opcionesOrdenadas = ordenGuardado
          .map((id) => opcionesPorId.get(id))
          .filter((opcion): opcion is (typeof opcionesOriginales)[number] => Boolean(opcion))

        if (opcionesOrdenadas.length === opcionesOriginales.length) {
          opcionesMezcladas = opcionesOrdenadas
        } else {
          opcionesMezcladas = shuffleArray(opcionesOriginales)
          opcionesPorRespuestaRef.current[respuesta.id] = opcionesMezcladas.map((opcion) => opcion.id)
        }
      } else {
        opcionesMezcladas = shuffleArray(opcionesOriginales)
        opcionesPorRespuestaRef.current[respuesta.id] = opcionesMezcladas.map((opcion) => opcion.id)
      }

      return {
        ...respuesta,
        pregunta: {
          ...respuesta.pregunta,
          opciones: opcionesMezcladas,
        },
      }
    })
  }, [respuestas, moduloId])

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
  })

  const handleSeleccionarOpcion = (respuestaId: string, opcionId: string) => {
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

  const queryErrorMessage =
    error?.response?.data?.detalle ??
    error?.response?.data?.detail ??
    'No fue posible cargar las preguntas del examen.'
  const guardarErrorMessage =
    guardarRespuestaMutation.error?.response?.data?.detalle ??
    guardarRespuestaMutation.error?.response?.data?.detail ??
    'No se pudo guardar tu respuesta.'

  if (!intentoId || !moduloId) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-usco-fondo p-6">
        <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
          Parametros de intento o modulo no validos.
        </div>
      </main>
    )
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-usco-fondo">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[18rem_1fr]">
        <aside className="border-b border-usco-ocre/80 bg-white p-5 lg:border-b-0 lg:border-r">
          <h1 className="text-xl font-bold text-usco-vino">Preguntas del Modulo</h1>
          <p className="mt-1 text-sm text-usco-gris">
            Navega y responde cada pregunta del modulo seleccionado.
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
              Volver a los Modulos
            </button>
            <h2 className="mt-3 text-lg font-semibold text-usco-vino">
              Modulo: {respuestaActiva?.pregunta.modulo_nombre ?? moduloId}
            </h2>
            <p className="mt-1 text-sm text-usco-gris">
              Pregunta {preguntaActivaIndex + 1} de {respuestasModulo.length}
            </p>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading && (
              <div className="rounded-xl border border-usco-ocre/80 bg-white p-6 shadow-sm">
                <SaberProLoader mensaje="Cargando tu examen..." />
              </div>
            )}

            {!isLoading && !isError && showRecoveredMessage && (
              <div className="mb-4 rounded-xl border border-usco-ocre/90 bg-usco-fondo p-4 text-sm text-usco-vino">
                Respuestas recuperadas desde tu sesion anterior.
              </div>
            )}

            {isError && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
                {queryErrorMessage}
              </div>
            )}

            {!isLoading && !isError && respuestasModulo.length === 0 && (
              <div className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
                Este modulo no tiene preguntas asignadas en el intento.
              </div>
            )}

            {!isLoading && !isError && respuestaActiva && (
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

                {(respuestaActiva.pregunta.soporte_multimedia === 'IMAGEN' ||
                  (!respuestaActiva.pregunta.soporte_multimedia &&
                    Boolean(respuestaActiva.pregunta.imagen_grafica))) &&
                  respuestaActiva.pregunta.imagen_grafica && (
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
                        disabled={isSavingCurrentAnswer}
                        className={`w-full rounded-lg border p-4 text-left transition ${
                          isSelected
                            ? 'border-usco-vino bg-red-50 text-usco-vino'
                            : 'border-gray-200 bg-white text-usco-gris hover:border-usco-ocre'
                        } ${isSavingCurrentAnswer ? 'cursor-not-allowed opacity-70' : ''}`}
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
                                alt="Recurso de la opcion"
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
                <button
                  type="button"
                  onClick={() => navigate(`/evaluaciones/intento/${intentoId}`)}
                  className="rounded bg-usco-vino px-6 py-2 font-medium text-white transition hover:bg-red-900"
                >
                  Finalizar Modulo
                </button>
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
    </main>
  )
}

export default PresentarExamenPage
