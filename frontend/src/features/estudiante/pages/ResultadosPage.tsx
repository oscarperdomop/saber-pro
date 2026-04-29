import type { AxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, FileText, TrendingUp, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import type { IntentoPrevio } from '../../../types/evaluaciones'
import { getMisIntentos } from '../services/estudianteService'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

const formatDate = (dateValue?: string | null): string => {
  if (!dateValue) {
    return 'N/A'
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }

  return date.toLocaleDateString('es-CO')
}

const ResultadosPage = () => {
  const navigate = useNavigate()

  const { data, isLoading, isError, error } = useQuery<IntentoPrevio[], AxiosError<ApiErrorResponse>>({
    queryKey: ['misIntentosResultados'],
    queryFn: getMisIntentos,
  })

  if (isLoading) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 shadow-sm">
        <SaberProLoader mensaje="Cargando resultados..." />
      </section>
    )
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error.response?.data?.detail ??
          error.response?.data?.detalle ??
          'No fue posible cargar tu historial de resultados.'}
      </section>
    )
  }

  const intentos = data ?? []
  const intentosFinalizados = intentos.filter(
    (intento) => intento.estado === 'Finalizado' || intento.estado === 'Pendiente Calificacion',
  )

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center gap-2">
        <Trophy className="h-6 w-6 text-usco-vino" />
        <h1 className="text-3xl font-bold text-usco-vino">Resultados</h1>
        <span className="rounded-full bg-usco-fondo px-3 py-1 text-xs font-semibold text-usco-gris">
          {intentosFinalizados.length} registros
        </span>
      </header>

      {intentosFinalizados.length === 0 ? (
        <article className="rounded-2xl border border-usco-ocre/70 bg-white p-6 text-sm text-usco-gris shadow-sm">
          Aún no tienes simulacros finalizados. Completa un simulacro y vuelve aquí para ver tu
          reporte.
        </article>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {intentosFinalizados.map((intento) => (
            <article
              key={intento.id}
              className="rounded-2xl border border-usco-ocre/80 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-usco-vino">
                    {intento.plantilla_titulo ?? 'Simulacro finalizado'}
                  </h2>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-usco-gris">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Finalizado: {formatDate(intento.fecha_finalizacion)}
                  </p>
                </div>
                <div className="rounded-xl border border-usco-ocre/70 bg-usco-fondo px-4 py-2 text-right">
                  <p className="text-xs uppercase tracking-wide text-usco-gris/80">Puntaje</p>
                  <p className="text-2xl font-bold text-usco-vino">{intento.puntaje_global ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-usco-vino/10 px-2.5 py-1 text-xs font-semibold text-usco-vino">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Estado: {intento.estado}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/evaluaciones/intento/${intento.id}/resultados`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-usco-vino px-4 py-2 text-sm font-semibold text-usco-vino transition hover:bg-red-50"
                >
                  <FileText className="h-4 w-4" />
                  Ver Resultado
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default ResultadosPage

