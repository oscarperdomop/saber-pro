import type { AxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react'
import adminService from '../../admin/services/adminService'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import type { AnaliticasResponse, ParticipacionPrograma, PreguntaCritica } from '../../../types/admin'

interface ApiErrorResponse {
  detail?: string
}

const calculateErrorRate = (pregunta: PreguntaCritica): number => {
  if (!pregunta.total_veces) {
    return 0
  }
  return Number(((pregunta.veces_incorrecta / pregunta.total_veces) * 100).toFixed(1))
}

const AdminDashboard = () => {
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<AnaliticasResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['kpisGlobales'],
    queryFn: adminService.getKpisGlobales,
  })

  if (isLoading) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 shadow-sm">
        <SaberProLoader mensaje="Cargando inteligencia academica..." />
      </section>
    )
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error.response?.data?.detail ?? 'No fue posible cargar las analiticas globales.'}
      </section>
    )
  }

  if (!data) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
        No hay datos disponibles por ahora.
      </section>
    )
  }

  const programas = data.participacion_por_programa
  const preguntasCriticas = data.top_preguntas_criticas

  const totalProgramas = programas.length
  const totalParticipantes = programas.reduce((acc, programa) => acc + programa.total, 0)
  const maxParticipacion = Math.max(...programas.map((programa) => programa.total), 1)

  const avgErrorRate =
    preguntasCriticas.length > 0
      ? Number(
          (
            preguntasCriticas.reduce((acc, pregunta) => acc + calculateErrorRate(pregunta), 0) /
            preguntasCriticas.length
          ).toFixed(1),
        )
      : 0

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-usco-vino to-[#741017] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/80">Inteligencia Academica</p>
            <h1 className="mt-2 text-3xl font-bold">Dashboard Administrativo Saber Pro</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Monitorea participacion institucional y detecta focos de mejora academica con
              indicadores en tiempo real.
            </p>
          </div>

          <article className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.14em] text-white/75">Evaluaciones Completadas</p>
            <p className="mt-2 text-5xl font-bold">{data.total_evaluaciones_finalizadas}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/85">
              <TrendingUp className="h-3.5 w-3.5" />
              Indicador principal
            </p>
          </article>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-usco-gris/80">Programas con actividad</p>
          <p className="mt-2 text-3xl font-bold text-usco-vino">{totalProgramas}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-usco-gris">
            <GraduationCap className="h-3.5 w-3.5" />
            Cohortes activas
          </p>
        </article>

        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-usco-gris/80">Participaciones</p>
          <p className="mt-2 text-3xl font-bold text-usco-vino">{totalParticipantes}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-usco-gris">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Registros por programa
          </p>
        </article>

        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-usco-gris/80">Preguntas criticas</p>
          <p className="mt-2 text-3xl font-bold text-usco-vino">{preguntasCriticas.length}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-usco-gris">
            <AlertTriangle className="h-3.5 w-3.5" />
            Riesgo academico
          </p>
        </article>

        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-usco-gris/80">Tasa media de error</p>
          <p className="mt-2 text-3xl font-bold text-usco-vino">{avgErrorRate}%</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-usco-gris">
            <Target className="h-3.5 w-3.5" />
            Sobre preguntas criticas
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-bold text-usco-vino">Participacion por Programa</h2>
          <p className="mt-1 text-sm text-usco-gris">Comparativo de estudiantes activos por programa.</p>

          <ul className="mt-5 space-y-4">
            {programas.length === 0 && (
              <li className="rounded-xl border border-usco-ocre/70 bg-usco-fondo p-4 text-sm text-usco-gris">
                Sin participacion registrada.
              </li>
            )}

            {programas.map((programa: ParticipacionPrograma) => {
              const pct = Number(((programa.total / maxParticipacion) * 100).toFixed(1))
              return (
                <li key={programa.estudiante__programa__nombre} className="rounded-xl border border-usco-ocre/70 bg-usco-fondo/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-usco-gris">{programa.estudiante__programa__nombre}</p>
                    <span className="rounded-full bg-usco-vino px-3 py-1 text-xs font-bold text-white">
                      {programa.total}
                    </span>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-usco-ocre/40">
                    <div className="h-full rounded-full bg-usco-vino" style={{ width: `${pct}%` }} />
                  </div>

                  <p className="mt-2 text-xs text-usco-gris/80">Cobertura relativa: {pct}%</p>
                </li>
              )
            })}
          </ul>
        </article>

        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-6 shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-usco-vino">Top Preguntas Criticas</h2>
              <p className="mt-1 text-sm text-usco-gris">Prioriza intervenciones en los enunciados con mayor error.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-usco-ocre/80 bg-usco-fondo px-3 py-1 text-xs font-semibold text-usco-gris">
              <BarChart3 className="h-3.5 w-3.5" />
              Analitica viva
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[780px] border border-usco-ocre/80">
              <thead>
                <tr className="bg-usco-fondo">
                  <th className="border border-usco-ocre/70 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                    Enunciado
                  </th>
                  <th className="border border-usco-ocre/70 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                    Respondida
                  </th>
                  <th className="border border-usco-ocre/70 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                    Incorrecta
                  </th>
                  <th className="border border-usco-ocre/70 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                    Tasa Error
                  </th>
                  <th className="border border-usco-ocre/70 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                    Impacto
                  </th>
                </tr>
              </thead>
              <tbody>
                {preguntasCriticas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-usco-ocre/70 px-4 py-4 text-sm text-usco-gris">
                      No hay preguntas criticas registradas.
                    </td>
                  </tr>
                )}

                {preguntasCriticas.map((pregunta, index) => {
                  const tasaError = calculateErrorRate(pregunta)
                  const altoImpacto = tasaError >= 50

                  return (
                    <tr
                      key={`${pregunta.pregunta__enunciado}-${index}`}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-usco-fondo/45'}
                    >
                      <td className="border border-usco-ocre/70 px-4 py-3 text-sm text-usco-gris">
                        <span className="block max-w-[360px] truncate" title={pregunta.pregunta__enunciado}>
                          {pregunta.pregunta__enunciado}
                        </span>
                      </td>
                      <td className="border border-usco-ocre/70 px-4 py-3 text-center text-sm font-semibold text-usco-gris">
                        {pregunta.total_veces}
                      </td>
                      <td className="border border-usco-ocre/70 px-4 py-3 text-center text-sm font-semibold text-usco-gris">
                        {pregunta.veces_incorrecta}
                      </td>
                      <td
                        className={`border border-usco-ocre/70 px-4 py-3 text-center text-sm font-bold ${
                          altoImpacto ? 'text-usco-vino' : 'text-usco-gris'
                        }`}
                      >
                        {tasaError}%
                      </td>
                      <td className="border border-usco-ocre/70 px-4 py-3">
                        <div className="mx-auto h-2 w-32 overflow-hidden rounded-full bg-usco-ocre/40">
                          <div
                            className="h-full rounded-full bg-usco-vino"
                            style={{ width: `${Math.min(tasaError, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-usco-gris/80">
          <ShieldCheck className="h-4 w-4 text-usco-vino" />
          Control Academico Institucional
        </p>
      </section>
    </section>
  )
}

export default AdminDashboard
