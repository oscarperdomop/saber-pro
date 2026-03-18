import type { AxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  BookCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Play,
  Sparkles,
  Timer,
  Trophy,
  TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../hooks/useAuthStore'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import type { IntentoPrevio, PlantillaExamen } from '../../../types/evaluaciones'
import {
  getMisIntentos,
  getSimulacrosDisponibles,
  iniciarIntento,
} from '../services/estudianteService'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

const resolvePlantillaId = (
  plantilla: IntentoPrevio['plantilla_examen'],
): string | number | null => {
  if (typeof plantilla === 'string' || typeof plantilla === 'number') {
    return plantilla
  }

  if (plantilla && typeof plantilla === 'object' && 'id' in plantilla) {
    return plantilla.id
  }

  return null
}

const isIntentoFinalizado = (estado: string): boolean => {
  return estado === 'Finalizado' || estado === 'Pendiente Calificacion'
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

const getSimulacroModules = (simulacro: PlantillaExamen): string[] => {
  if (Array.isArray(simulacro.modulos) && simulacro.modulos.length > 0) {
    return simulacro.modulos.filter(Boolean)
  }
  return ['Sin detalle de modulos']
}

const getSimulacroDifficulty = (simulacro: PlantillaExamen): string => {
  return simulacro.dificultad_referencia || 'Intermedio'
}

const DashboardEstudiantePage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const simulacrosQuery = useQuery<PlantillaExamen[], AxiosError<ApiErrorResponse>>({
    queryKey: ['simulacrosDisponiblesDashboard'],
    queryFn: getSimulacrosDisponibles,
  })

  const intentosQuery = useQuery<IntentoPrevio[], AxiosError<ApiErrorResponse>>({
    queryKey: ['misIntentosDashboard'],
    queryFn: getMisIntentos,
  })

  const iniciarIntentoMutation = useMutation<
    { intento_id: string },
    AxiosError<ApiErrorResponse>,
    string
  >({
    mutationFn: iniciarIntento,
    onSuccess: (data) => {
      navigate(`/evaluaciones/intento/${data.intento_id}`)
    },
  })

  if (simulacrosQuery.isLoading || intentosQuery.isLoading) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 shadow-sm">
        <SaberProLoader mensaje="Cargando dashboard..." />
      </section>
    )
  }

  if (simulacrosQuery.isError || intentosQuery.isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {simulacrosQuery.error?.response?.data?.detail ??
          simulacrosQuery.error?.response?.data?.detalle ??
          intentosQuery.error?.response?.data?.detail ??
          intentosQuery.error?.response?.data?.detalle ??
          'No fue posible cargar la informacion del dashboard.'}
      </section>
    )
  }

  const simulacros = simulacrosQuery.data ?? []
  const intentos = intentosQuery.data ?? []

  const intentosFinalizados = intentos.filter((intento) => isIntentoFinalizado(intento.estado))
  const intentosEnProgreso = intentos.filter((intento) => intento.estado === 'En Progreso')
  const intentosFinalizadosIds = new Set(
    intentosFinalizados
      .map((intento) => resolvePlantillaId(intento.plantilla_examen))
      .filter((id): id is string | number => id !== null),
  )

  const simulacrosPendientes = simulacros.filter(
    (simulacro) => !intentosFinalizadosIds.has(simulacro.id),
  )
  const simulacrosConEstado = simulacros.map((simulacro) => {
    const intentoRelacionado = intentos.find((intento) => {
      const plantillaId = resolvePlantillaId(intento.plantilla_examen)
      return String(plantillaId) === String(simulacro.id)
    })

    if (!intentoRelacionado) {
      return { simulacro, estado: 'Disponible' as const, intento: null }
    }

    if (intentoRelacionado.estado === 'En Progreso') {
      return { simulacro, estado: 'En progreso' as const, intento: intentoRelacionado }
    }

    if (isIntentoFinalizado(intentoRelacionado.estado)) {
      return { simulacro, estado: 'Finalizado' as const, intento: intentoRelacionado }
    }

    return { simulacro, estado: 'Disponible' as const, intento: intentoRelacionado }
  })

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-usco-vino to-[#741017] p-6 text-white shadow-lg">
        <div className="max-w-3xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Preparacion Saber Pro
            </p>
            <h1 className="mt-2 text-3xl font-bold">Hola, {user?.nombres ?? 'Estudiante'}.</h1>
            <p className="mt-2 text-sm text-white/85">
              Revisa tus simulacros activos, continua tus intentos y consulta tu historial de
              resultados en un solo lugar.
            </p>
          </div>

          <div className="mt-5 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <article className="rounded-xl bg-white/15 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-white/75">Disponibles</p>
              <p className="mt-1 text-2xl font-bold">{simulacrosPendientes.length}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
                <Play className="h-3.5 w-3.5" />
                Simulacros
              </p>
            </article>
            <article className="rounded-xl bg-white/15 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-white/75">En progreso</p>
              <p className="mt-1 text-2xl font-bold">{intentosEnProgreso.length}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
                <Timer className="h-3.5 w-3.5" />
                Intentos
              </p>
            </article>
            <article className="rounded-xl bg-white/15 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-white/75">Finalizados</p>
              <p className="mt-1 text-2xl font-bold">{intentosFinalizados.length}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Historial
              </p>
            </article>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Play className="h-5 w-5 text-usco-vino" />
          <h2 className="text-2xl font-bold text-usco-vino">Simulacros Disponibles</h2>
          <span className="rounded-full bg-usco-fondo px-3 py-1 text-xs font-semibold text-usco-gris">
            {simulacrosPendientes.length} activos
          </span>
        </div>

        {simulacrosPendientes.length === 0 ? (
          <article className="rounded-2xl border border-usco-ocre/70 bg-white p-6 text-sm text-usco-gris shadow-sm">
            <p className="font-semibold text-usco-vino">Al dia, excelente progreso.</p>
            <p className="mt-1">No tienes simulacros activos pendientes, pero puedes revisar los ya presentados.</p>
          </article>
        ) : (
          <></>
        )}

        {simulacros.length === 0 ? (
          <article className="rounded-2xl border border-usco-ocre/70 bg-white p-6 text-sm text-usco-gris shadow-sm">
            No hay simulacros programados para tu perfil en este momento.
          </article>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {simulacrosConEstado.map(({ simulacro, estado, intento }) => {
              const modulos = getSimulacroModules(simulacro)
              const dificultad = getSimulacroDifficulty(simulacro)

              return (
                <article
                  key={String(simulacro.id)}
                  className={`group relative overflow-hidden rounded-2xl border border-usco-ocre/80 bg-white p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                    estado === 'Finalizado' ? 'opacity-85' : ''
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-usco-vino to-[#741017]" />

                  <div className="flex h-full flex-col p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                          estado === 'Finalizado'
                            ? 'bg-usco-gris text-white'
                            : estado === 'En progreso'
                              ? 'bg-usco-ocre text-usco-vino'
                              : 'bg-green-800 text-white'
                        }`}
                      >
                        {estado}
                      </span>
                      <span className="rounded-lg border border-usco-ocre/70 bg-usco-fondo px-3 py-1 text-xs font-medium text-usco-gris">
                        {dificultad}
                      </span>
                    </div>

                    <h3 className="mt-5 min-h-[64px] text-lg font-bold leading-tight text-usco-gris">
                      {simulacro.titulo}
                    </h3>
                    <p className="mt-3 min-h-[72px] text-sm text-usco-gris/90">{simulacro.descripcion}</p>

                    <div className="mt-4 flex min-h-[66px] flex-wrap gap-2">
                      {modulos.slice(0, 3).map((modulo) => (
                        <span
                          key={modulo}
                          className="inline-flex items-center rounded-md bg-usco-fondo px-2.5 py-1 text-xs font-medium text-usco-gris"
                        >
                          {modulo}
                        </span>
                      ))}
                      {modulos.length > 3 && (
                        <span className="inline-flex items-center rounded-md bg-usco-fondo px-2.5 py-1 text-xs font-semibold text-usco-gris">
                          +{modulos.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-usco-gris">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <Clock3 className="h-4 w-4" />
                        {simulacro.tiempo_minutos} min
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <BookCheck className="h-4 w-4" />
                        {simulacro.cantidad_preguntas ?? 0} preguntas
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm text-usco-gris">
                        <CalendarClock className="h-4 w-4" />
                        {estado === 'Finalizado'
                          ? formatDate(intento?.fecha_finalizacion)
                          : formatDate(simulacro.fecha_fin)}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          if (estado === 'Finalizado' && intento?.id) {
                            navigate(`/evaluaciones/intento/${intento.id}/resultados`)
                            return
                          }
                          if (estado === 'En progreso' && intento?.id) {
                            navigate(`/evaluaciones/intento/${intento.id}`)
                            return
                          }
                          iniciarIntentoMutation.mutate(String(simulacro.id))
                        }}
                        disabled={
                          iniciarIntentoMutation.isPending ||
                          (estado === 'Finalizado' && !intento?.id)
                        }
                        className={`rounded-xl px-4 py-2 text-base font-semibold text-white transition ${
                          estado === 'Finalizado'
                            ? 'bg-usco-gris hover:bg-[#3a4b53]'
                            : estado === 'En progreso'
                              ? 'bg-usco-ocre text-usco-vino hover:bg-yellow-200'
                              : 'bg-usco-vino hover:bg-[#741017] group-hover:shadow-md'
                        } ${
                          iniciarIntentoMutation.isPending || (estado === 'Finalizado' && !intento?.id)
                            ? 'cursor-not-allowed opacity-70'
                            : ''
                        }`}
                      >
                        {estado === 'Finalizado'
                          ? 'Resultados'
                          : estado === 'En progreso'
                            ? 'Continuar'
                            : 'Iniciar'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {iniciarIntentoMutation.isError && (
          <article className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {iniciarIntentoMutation.error?.response?.data?.detail ??
              iniciarIntentoMutation.error?.response?.data?.detalle ??
              'No fue posible iniciar el simulacro.'}
          </article>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Trophy className="h-5 w-5 text-usco-vino" />
          <h2 className="text-2xl font-bold text-usco-vino">Mis Resultados</h2>
          <span className="rounded-full bg-usco-fondo px-3 py-1 text-xs font-semibold text-usco-gris">
            {intentosFinalizados.length} registros
          </span>
        </div>

        {intentosFinalizados.length === 0 ? (
          <article className="rounded-2xl border border-usco-ocre/70 bg-white p-6 text-sm text-usco-gris shadow-sm">
            Aun no tienes intentos finalizados. Completa un simulacro para ver tu historial.
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
                    <h3 className="text-lg font-bold text-usco-vino">
                      {intento.plantilla_titulo ?? 'Simulacro finalizado'}
                    </h3>
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
                    Ver Reporte y Plan de Estudio
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-usco-ocre/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-usco-gris/80">Rendimiento</p>
            <h3 className="mt-1 text-xl font-bold text-usco-vino">Sigue fortaleciendo tus modulos</h3>
            <p className="mt-1 text-sm text-usco-gris">
              Cada intento te acerca a un mejor puntaje en tu examen de Estado.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-usco-vino/10 px-4 py-3 text-sm font-semibold text-usco-vino">
            <Sparkles className="h-4 w-4" />
            Revisa recomendaciones IA en tus reportes
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-usco-ocre/70 bg-usco-fondo/40 p-3">
            <p className="text-xs uppercase tracking-wide text-usco-gris/80">Ultimo puntaje</p>
            <p className="mt-1 text-2xl font-bold text-usco-vino">
              {intentosFinalizados[0]?.puntaje_global ?? 0}
            </p>
          </article>
          <article className="rounded-xl border border-usco-ocre/70 bg-usco-fondo/40 p-3">
            <p className="text-xs uppercase tracking-wide text-usco-gris/80">Intentos completados</p>
            <p className="mt-1 text-2xl font-bold text-usco-vino">{intentosFinalizados.length}</p>
          </article>
          <article className="rounded-xl border border-usco-ocre/70 bg-usco-fondo/40 p-3">
            <p className="text-xs uppercase tracking-wide text-usco-gris/80">Simulacros pendientes</p>
            <p className="mt-1 text-2xl font-bold text-usco-vino">{simulacrosPendientes.length}</p>
          </article>
        </div>
      </section>
    </section>
  )
}

export default DashboardEstudiantePage
