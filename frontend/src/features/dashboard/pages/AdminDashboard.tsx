import type { AxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import adminService from '../../admin/services/adminService'
import type { AnaliticasResponse } from '../../../types/admin'

interface ApiErrorResponse {
  detail?: string
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
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
        Cargando inteligencia academica...
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

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-usco-vino">Inteligencia Academica - Saber Pro</h1>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="rounded-2xl bg-usco-vino p-8 text-white shadow-sm">
          <p className="text-sm uppercase tracking-[0.18em] text-white/85">Indicador Principal</p>
          <p className="mt-3 text-6xl font-bold">{data.total_evaluaciones_finalizadas}</p>
          <p className="mt-3 text-sm text-white/90">Evaluaciones Completadas</p>
        </article>

        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-usco-vino">Participacion por Programa</h2>
          <ul className="mt-4 space-y-3">
            {data.participacion_por_programa.length === 0 && (
              <li className="text-sm text-usco-gris">Sin participacion registrada.</li>
            )}
            {data.participacion_por_programa.map((programa) => (
              <li
                key={programa.estudiante__programa__nombre}
                className="flex items-center justify-between rounded-xl border border-usco-ocre/70 px-4 py-3"
              >
                <span className="pr-4 text-sm font-medium text-usco-gris">
                  {programa.estudiante__programa__nombre}
                </span>
                <span className="rounded-full bg-usco-ocre px-3 py-1 text-sm font-bold text-usco-vino">
                  {programa.total}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-6 shadow-sm lg:col-span-3">
          <h2 className="text-lg font-bold text-usco-vino">Top Preguntas Criticas</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border border-usco-gris/50">
              <thead>
                <tr className="bg-usco-fondo">
                  <th className="border border-usco-gris/40 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                    Enunciado de la Pregunta
                  </th>
                  <th className="border border-usco-gris/40 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                    Veces Respondida
                  </th>
                  <th className="border border-usco-gris/40 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                    Veces Incorrecta
                  </th>
                  <th className="border border-usco-gris/40 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                    Tasa de Error (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.top_preguntas_criticas.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="border border-usco-gris/40 px-4 py-4 text-sm text-usco-gris"
                    >
                      No hay preguntas criticas registradas.
                    </td>
                  </tr>
                )}

                {data.top_preguntas_criticas.map((pregunta, index) => {
                  const tasaError =
                    pregunta.total_veces > 0
                      ? ((pregunta.veces_incorrecta / pregunta.total_veces) * 100).toFixed(1)
                      : '0.0'
                  const isHighError = Number(tasaError) > 50

                  return (
                    <tr
                      key={`${pregunta.pregunta__enunciado}-${index}`}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-usco-fondo/50'}
                    >
                      <td className="border border-usco-gris/40 px-4 py-3 text-sm text-usco-gris">
                        {pregunta.pregunta__enunciado}
                      </td>
                      <td className="border border-usco-gris/40 px-4 py-3 text-center text-sm font-semibold text-usco-gris">
                        {pregunta.total_veces}
                      </td>
                      <td className="border border-usco-gris/40 px-4 py-3 text-center text-sm font-semibold text-usco-gris">
                        {pregunta.veces_incorrecta}
                      </td>
                      <td
                        className={`border border-usco-gris/40 px-4 py-3 text-center text-sm font-bold ${
                          isHighError ? 'text-red-600' : 'text-usco-gris'
                        }`}
                      >
                        {tasaError}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}

export default AdminDashboard
