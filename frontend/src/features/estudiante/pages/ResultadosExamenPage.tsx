import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import SafeRichTextRenderer from '../../../components/ui/SafeRichTextRenderer'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import estudianteService from '../services/estudianteService'
import type {
  PreguntaErroneaResultado,
  PuntajeModuloResultado,
  ResumenResultados,
} from '../../../types/evaluaciones'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
  error?: string
  fecha_disponible?: string
  simulacro?: string
}

const clampPercentil = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

const PercentileScale = ({
  percentil,
  groupPercentil,
}: {
  percentil: number
  groupPercentil: number
}) => {
  const safePercentil = clampPercentil(percentil)
  const safeGroupPercentil = clampPercentil(groupPercentil)

  return (
    <div className="relative mx-auto w-full max-w-xs px-2 py-3">
      <div className="relative h-[2px] w-full bg-usco-gris/60">
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            className="absolute top-1/2 h-2 w-[2px] -translate-y-1/2 bg-usco-gris/70"
            style={{ left: `${tick}%` }}
          />
        ))}

        <div className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-usco-gris/70 bg-white" />
        <span className="absolute -top-2 -translate-x-1/2 text-[10px] font-semibold text-usco-gris/80" style={{ left: '100%' }}>
          100
        </span>

        <div className="absolute top-1/2 -translate-x-1/2" style={{ left: `${safeGroupPercentil}%` }}>
          <div className="relative">
            <svg width="10" height="8" viewBox="0 0 10 8" className="translate-y-0.5">
              <polygon points="5,0 10,8 0,8" fill="currentColor" className="text-usco-gris" />
            </svg>
            <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-usco-gris">
              {safeGroupPercentil}
            </span>
          </div>
        </div>

        <div className="absolute top-1/2 -translate-x-1/2" style={{ left: `${safePercentil}%` }}>
          <div className="relative">
            <svg width="10" height="8" viewBox="0 0 10 8" className="-translate-y-2.5">
              <polygon
                points="5,8 10,0 0,0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-usco-vino"
              />
            </svg>
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-usco-vino">
              {safePercentil}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const ResultadosExamenPage = () => {
  const { intentoId } = useParams<{ intentoId: string }>()
  const navigate = useNavigate()
  const [planIA, setPlanIA] = useState('')

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<ResumenResultados, AxiosError<ApiErrorResponse>>({
    queryKey: ['resumenResultados', intentoId],
    queryFn: () => estudianteService.getResumenResultados(intentoId as string),
    enabled: Boolean(intentoId),
  })

  useEffect(() => {
    if (data?.plan_ia) {
      setPlanIA(data.plan_ia)
      return
    }

    if (data?.plan_estudio_ia) {
      setPlanIA(data.plan_estudio_ia)
    }
  }, [data?.plan_ia, data?.plan_estudio_ia])

  const generarPlanMutation = useMutation<
    { plan: string },
    AxiosError<ApiErrorResponse>,
    { intentoId: string; forzar?: boolean }
  >({
    mutationFn: ({ intentoId: id, forzar }) =>
      estudianteService.generarPlanEstudioIA(id, { forzar }),
    onSuccess: (response) => {
      setPlanIA(response.plan)
    },
  })

  if (!intentoId) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        Intento no válido.
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 shadow-sm">
        <SaberProLoader mensaje="Cargando resultados..." />
      </section>
    )
  }

  if (isError && error.response?.status === 403) {
    const fechaDisponibleRaw = error.response?.data?.fecha_disponible
    const fechaDisponible = fechaDisponibleRaw
      ? new Intl.DateTimeFormat('es-CO', {
          dateStyle: 'full',
          timeStyle: 'short',
        }).format(new Date(fechaDisponibleRaw))
      : null

    return (
      <section className="rounded-2xl border border-usco-ocre/80 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-usco-vino md:text-4xl">
          Examen finalizado. Tus resultados aún no están habilitados.
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-base text-usco-gris">
          La institución configuró este simulacro para mostrar resultados al cierre oficial.
          {fechaDisponible && (
            <>
              {' '}
              Estarán disponibles el <span className="font-semibold text-usco-vino">{fechaDisponible}</span>.
            </>
          )}
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate('/resultados')}
            className="rounded-xl border border-usco-gris/40 bg-white px-4 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
          >
            Volver a Resultados
          </button>
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error.response?.data?.detail ?? 'No fue posible cargar el resumen de resultados.'}
      </section>
    )
  }

  if (!data) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
        No hay resultados disponibles por el momento.
      </section>
    )
  }

  const modulos: PuntajeModuloResultado[] = Array.isArray(data.puntajes_por_modulo)
    ? (data.puntajes_por_modulo.filter((item) => item && typeof item === 'object') as PuntajeModuloResultado[])
    : []
  const preguntasErroneas: PreguntaErroneaResultado[] = Array.isArray(data.preguntas_erroneas)
    ? (data.preguntas_erroneas.filter((item) => item && typeof item === 'object') as PreguntaErroneaResultado[])
    : []
  const puntajeGlobalNumerico = Number(data.puntaje_saber_pro ?? 0)
  const groupPercentil = clampPercentil(Math.round((puntajeGlobalNumerico / 300) * 100))

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <button
          type="button"
          onClick={() => navigate('/resultados')}
          className="rounded-xl border border-usco-gris/40 bg-white px-4 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
        >
          Volver a Resultados
        </button>
      </div>

      <header className="rounded-2xl border border-usco-gris/50 bg-white px-6 py-5 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.16em] text-usco-gris">Puntaje Saber Pro</p>
        <p className="mt-2 text-5xl font-bold text-usco-vino md:text-[64px]">{data.puntaje_saber_pro}</p>
        <p className="mt-2 text-sm text-usco-gris md:text-base">
          Aciertos: {data.aciertos_brutos} de {data.total_preguntas} preguntas
        </p>
      </header>

      {data.estado_calificacion === 'Parcial' && (
        <aside className="rounded-xl border border-yellow-300 bg-usco-ocre p-4 text-sm text-yellow-900">
          Tu nota es parcial porque tienes ensayos pendientes de calificación por un profesor.
        </aside>
      )}

      <section className="space-y-2.5">
        <h2 className="text-center text-xl font-semibold tracking-wide text-usco-gris md:text-2xl">
          •RESULTADOS POR MÓDULOS•
        </h2>

        <div className="overflow-x-auto border-2 border-usco-gris/80 bg-white shadow-sm">
          <div className="min-w-[760px]">
            <div className="border-b-2 border-usco-gris/80 bg-usco-vino px-4 py-2.5 text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-white md:text-base">
                MÓDULOS COMPETENCIAS GENÉRICAS
              </p>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-usco-gris/80 bg-usco-fondo">
                  <th className="w-[30%] border-r-2 border-usco-gris/80 px-3 py-2.5 text-left text-sm font-semibold text-usco-gris md:text-lg">
                    MÓDULOS
                  </th>
                  <th className="w-[20%] border-r-2 border-usco-gris/80 px-3 py-2.5 text-center text-sm font-semibold text-usco-gris md:text-lg">
                    PUNTAJE POR MÓDULO
                  </th>
                  <th className="w-[50%] px-3 py-2.5 text-center text-sm font-semibold text-usco-gris md:text-lg">
                    ¿EN QUÉ PERCENTIL SE ENCUENTRA?
                  </th>
                </tr>
                <tr className="border-b-2 border-usco-gris/80 bg-white">
                  <th className="border-r-2 border-usco-gris/80 px-3 py-1.5" />
                  <th className="border-r-2 border-usco-gris/80 px-3 py-1.5 text-center text-xs font-normal text-usco-gris md:text-sm">
                    De 300 puntos posibles, su puntaje es
                  </th>
                  <th className="px-3 py-1.5" />
                </tr>
              </thead>

              <tbody>
                {modulos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-sm text-usco-gris">
                      No hay desglose por módulos disponible para este intento.
                    </td>
                  </tr>
                )}

                {modulos.map((modulo, index) => (
                  <tr
                    key={`${modulo.modulo}-${index}`}
                    className={`border-b border-usco-gris/70 last:border-b-0 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-usco-fondo/60'
                    }`}
                  >
                    <td className="border-r-2 border-usco-gris/80 px-3 py-4 text-base font-medium leading-tight text-usco-gris md:text-lg">
                      {String(modulo.modulo ?? 'General')}
                    </td>
                    <td className="border-r-2 border-usco-gris/80 px-3 py-4 text-center text-2xl font-bold text-usco-vino md:text-3xl">
                      {Number(modulo.puntaje ?? 0)}
                    </td>
                    <td className="px-3 py-3">
                      <PercentileScale
                        percentil={Number(modulo.percentil ?? 0)}
                        groupPercentil={groupPercentil}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 pt-1 text-[11px] text-usco-gris md:text-xs">
          <div className="flex items-center gap-2">
            <svg width="10" height="8" viewBox="0 0 10 8">
              <polygon
                points="5,8 10,0 0,0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-usco-vino"
              />
            </svg>
            <span>Su percentil</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="10" height="8" viewBox="0 0 10 8">
              <polygon points="5,0 10,8 0,8" fill="currentColor" className="text-usco-gris" />
            </svg>
            <span>Percentil del grupo</span>
          </div>
        </div>
      </section>

      <section className="grid h-auto grid-cols-1 gap-6 lg:h-[80vh] lg:grid-cols-2">
        <article className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-lg border border-gray-200 border-t-4 border-t-usco-vino bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 p-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <Sparkles className="h-5 w-5 text-usco-vino" />
              Plan de Estudio IA
            </h3>
            <button
              type="button"
              onClick={() =>
                intentoId &&
                generarPlanMutation.mutate({
                  intentoId,
                  forzar: Boolean(planIA),
                })
              }
              disabled={generarPlanMutation.isPending || !intentoId}
              className="rounded bg-usco-vino px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-900 disabled:opacity-50"
            >
              {generarPlanMutation.isPending
                ? 'Analizando...'
                : planIA
                  ? 'Regenerar Plan'
                  : 'Generar Plan'}
            </button>
          </header>

          <div className="flex-grow overflow-y-auto p-6">
            {planIA ? (
              <SafeRichTextRenderer
                content={planIA}
                className="prose-sm prose-headings:text-usco-vino prose-strong:text-usco-gris prose-p:text-usco-gris prose-li:text-usco-gris"
              />
            ) : (
              <div className="py-8 text-center text-gray-500">
                Genera tu plan para recibir una ruta personalizada de mejora.
              </div>
            )}

            {generarPlanMutation.isError && (
              <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {generarPlanMutation.error.response?.data?.detail ??
                  generarPlanMutation.error.response?.data?.detalle ??
                  'No fue posible generar el plan de estudio con IA en este momento.'}
              </p>
            )}
          </div>
        </article>

        <article className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-lg border border-gray-200 border-t-4 border-t-gray-700 bg-white shadow-sm">
          <header className="border-b bg-gray-50 p-4">
            <h3 className="text-lg font-bold text-gray-800">
              Preguntas Erróneas ({preguntasErroneas.length})
            </h3>
          </header>

          <div className="flex-grow overflow-y-auto bg-gray-100">
            {preguntasErroneas.length === 0 ? (
              <div className="p-6 text-sm text-usco-gris">
                No se registran preguntas erróneas para este intento.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {preguntasErroneas.map((pregunta, index) => (
                  <li
                    key={`${pregunta.id}-${index}`}
                    className="space-y-4 bg-white p-6 transition hover:bg-gray-50"
                  >
                    <SafeRichTextRenderer
                      content={String(pregunta.enunciado ?? '')}
                      className="prose-p:my-0 prose-p:font-semibold prose-p:text-gray-800 [&_.katex-display]:my-1"
                    />

                    <div className="rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm">
                      <span className="mb-1 block font-bold text-red-700">Tu respuesta:</span>
                      <SafeRichTextRenderer
                        content={String(pregunta.opcion_marcada ?? '')}
                        className="prose-p:my-0 prose-p:text-red-600 [&_.katex-display]:my-1"
                      />
                    </div>

                    <div className="rounded border-l-4 border-green-500 bg-green-50 p-3 text-sm">
                      <span className="mb-1 block font-bold text-green-700">Respuesta correcta:</span>
                      <SafeRichTextRenderer
                        content={String(pregunta.opcion_correcta ?? '')}
                        className="prose-p:my-0 prose-p:text-green-700 [&_.katex-display]:my-1"
                      />
                    </div>

                    {pregunta.retroalimentacion_especifica && (
                      <div className="rounded bg-blue-50 p-3 text-sm text-gray-700">
                        <strong>Feedback IA:</strong>
                        <SafeRichTextRenderer
                          content={String(pregunta.retroalimentacion_especifica ?? '')}
                          className="mt-1 prose-p:my-0 prose-p:text-gray-700 [&_.katex-display]:my-1"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </section>
    </section>
  )
}

export default ResultadosExamenPage

