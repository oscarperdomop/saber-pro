import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router-dom'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import estudianteService from '../services/estudianteService'
import type { PuntajeModuloResultado, ResumenResultados } from '../../../types/evaluaciones'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
  error?: string
}

const clampPercentil = (value: number): number => {
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
    if (data?.plan_estudio_ia) {
      setPlanIA(data.plan_estudio_ia)
    }
  }, [data?.plan_estudio_ia])

  const generarPlanMutation = useMutation<
    { plan: string },
    AxiosError<ApiErrorResponse>,
    string
  >({
    mutationFn: estudianteService.generarPlanEstudioIA,
    onSuccess: (response) => {
      setPlanIA(response.plan)
    },
  })

  if (!intentoId) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        Intento no valido.
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
    return (
      <section className="rounded-2xl border border-usco-ocre/80 bg-white p-10 text-center shadow-sm">
        <h1 className="text-4xl font-bold text-usco-vino">
          Examen Finalizado! Tus resultados estaran disponibles cuando cierre la ventana del
          simulacro.
        </h1>
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

  const modulos: PuntajeModuloResultado[] = data.puntajes_por_modulo ?? []
  const groupPercentil = clampPercentil(Math.round((data.puntaje_saber_pro / 300) * 100))

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header className="rounded-2xl border border-usco-gris/50 bg-white px-6 py-5 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.16em] text-usco-gris">Puntaje Saber Pro</p>
        <p className="mt-2 text-5xl font-bold text-usco-vino md:text-[64px]">{data.puntaje_saber_pro}</p>
        <p className="mt-2 text-sm text-usco-gris md:text-base">
          Aciertos: {data.aciertos_brutos} de {data.total_preguntas} preguntas
        </p>
      </header>

      {data.estado_calificacion === 'Parcial' && (
        <aside className="rounded-xl border border-yellow-300 bg-usco-ocre p-4 text-sm text-yellow-900">
          Tu nota es parcial porque tienes ensayos pendientes de calificacion por un profesor.
        </aside>
      )}

      <section className="space-y-2.5">
        <h2 className="text-center text-xl font-semibold tracking-wide text-usco-gris md:text-2xl">
          •RESULTADOS POR MODULOS•
        </h2>

        <div className="overflow-x-auto border-2 border-usco-gris/80 bg-white shadow-sm">
          <div className="min-w-[760px]">
            <div className="border-b-2 border-usco-gris/80 bg-usco-vino px-4 py-2.5 text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-white md:text-base">
                MODULOS COMPETENCIAS GENERICAS
              </p>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-usco-gris/80 bg-usco-fondo">
                  <th className="w-[30%] border-r-2 border-usco-gris/80 px-3 py-2.5 text-left text-sm font-semibold text-usco-gris md:text-lg">
                    MODULOS
                  </th>
                  <th className="w-[20%] border-r-2 border-usco-gris/80 px-3 py-2.5 text-center text-sm font-semibold text-usco-gris md:text-lg">
                    PUNTAJE POR MODULO
                  </th>
                  <th className="w-[50%] px-3 py-2.5 text-center text-sm font-semibold text-usco-gris md:text-lg">
                    EN QUE PERCENTIL SE ENCUENTRA?
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
                      No hay desglose por modulos disponible para este intento.
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
                      {modulo.modulo}
                    </td>
                    <td className="border-r-2 border-usco-gris/80 px-3 py-4 text-center text-2xl font-bold text-usco-vino md:text-3xl">
                      {modulo.puntaje}
                    </td>
                    <td className="px-3 py-3">
                      <PercentileScale
                        percentil={modulo.percentil}
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

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-usco-vino to-red-800 p-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="h-5 w-5" />
            Tutor Virtual IA: Tu Plan de Mejora
          </h3>
          {!planIA && (
            <button
              type="button"
              onClick={() => intentoId && generarPlanMutation.mutate(intentoId)}
              disabled={generarPlanMutation.isPending || !intentoId}
              className="rounded bg-white px-4 py-2 font-semibold text-usco-vino transition hover:bg-red-50 disabled:opacity-50"
            >
              {generarPlanMutation.isPending ? 'Analizando respuestas...' : 'Generar mi Plan'}
            </button>
          )}
        </div>

        <div className="p-6">
          {planIA ? (
            <article className="prose prose-sm max-w-none prose-headings:text-usco-vino prose-strong:text-usco-gris prose-p:text-usco-gris prose-li:text-usco-gris">
              <ReactMarkdown>{planIA}</ReactMarkdown>
            </article>
          ) : (
            <div className="py-8 text-center text-gray-500">
              Haz clic en el boton de arriba para que la Inteligencia Artificial analice tus
              errores y te cree una ruta de estudio personalizada.
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
      </section>
    </section>
  )
}

export default ResultadosExamenPage
