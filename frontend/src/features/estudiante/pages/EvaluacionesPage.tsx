import { useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import estudianteService from '../services/estudianteService'
import type {
  IniciarIntentoResponse,
  IntentoPrevio,
  PlantillaExamen,
} from '../../../types/evaluaciones'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

const formatDate = (value: string): string => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible'
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const resolvePlantillaId = (plantilla: IntentoPrevio['plantilla_examen']): string | null => {
  if (typeof plantilla === 'string' || typeof plantilla === 'number') {
    return String(plantilla)
  }

  if (plantilla && typeof plantilla === 'object' && 'id' in plantilla) {
    const value = plantilla.id
    return typeof value === 'string' || typeof value === 'number' ? String(value) : null
  }

  return null
}

const EvaluacionesPage = () => {
  const navigate = useNavigate()
  const [inicioError, setInicioError] = useState<{ examenId: string | null; message: string } | null>(null)

  const {
    data: examenes = [],
    isLoading: isLoadingExamenes,
    isError: isErrorExamenes,
    error: examenesError,
  } = useQuery<PlantillaExamen[], AxiosError<ApiErrorResponse>>({
    queryKey: ['examenesDisponibles'],
    queryFn: estudianteService.getExamenesDisponibles,
  })

  const {
    data: intentos = [],
    isLoading: isLoadingIntentos,
    isError: isErrorIntentos,
    error: intentosError,
  } = useQuery<IntentoPrevio[], AxiosError<ApiErrorResponse>>({
    queryKey: ['misIntentos'],
    queryFn: estudianteService.getMisIntentos,
  })

  const iniciarIntentoMutation = useMutation<
    IniciarIntentoResponse,
    AxiosError<ApiErrorResponse>,
    string
  >({
    mutationFn: estudianteService.iniciarIntento,
    onMutate: (examenId) => {
      setInicioError((prev) => (prev?.examenId === examenId ? null : prev))
    },
    onSuccess: (data) => {
      setInicioError(null)
      navigate(`/evaluaciones/intento/${data.intento_id}`)
    },
    onError: (error, examenId) => {
      const message =
        error.response?.data?.detalle ??
        error.response?.data?.detail ??
        'No se pudo iniciar el simulacro.'
      setInicioError({
        examenId,
        message,
      })
    },
  })

  const isLoading = isLoadingExamenes || isLoadingIntentos
  const isError = isErrorExamenes || isErrorIntentos
  const queryError = examenesError ?? intentosError

  const queryErrorMessage =
    queryError?.response?.data?.detail ?? 'No fue posible cargar los simulacros disponibles.'
  const mutationErrorMessage =
    iniciarIntentoMutation.error?.response?.data?.detalle ??
    iniciarIntentoMutation.error?.response?.data?.detail ??
    inicioError?.message ??
    'No se pudo iniciar el simulacro.'

  return (
    <section className="mx-auto w-full max-w-6xl">
      <header className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-usco-vino sm:text-3xl">
          Evaluaciones Disponibles
        </h1>
        <p className="mt-2 text-sm text-usco-gris">
          Selecciona un simulacro para iniciar tu practica academica.
        </p>
      </header>

      {isLoading && (
        <div className="rounded-lg border border-usco-ocre/80 bg-white p-6 shadow-sm">
          <SaberProLoader mensaje="Cargando simulacros..." />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-700">
          {queryErrorMessage}
        </div>
      )}

      {!isLoading && !isError && examenes.length === 0 && (
        <div className="rounded-lg border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
          No hay simulacros programados en este momento.
        </div>
      )}

      {!isLoading && !isError && examenes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          {examenes.map((examen) => {
            const examenId = String(examen.id)
            const intento = intentos.find(
              (item) => resolvePlantillaId(item.plantilla_examen) === examenId,
            )

            return (
              <article
                key={examen.id}
                className="group flex h-full flex-col rounded-2xl border border-usco-ocre/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <h2 className="text-xl font-bold leading-tight text-usco-vino">{examen.titulo}</h2>
                <p className="mt-3 text-sm text-usco-gris">{examen.descripcion}</p>

                <div className="mt-4 space-y-2 text-sm text-usco-gris">
                  <p className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-usco-vino" />
                    {examen.tiempo_minutos} min
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-usco-vino" />
                    Inicio: {formatDate(examen.fecha_inicio)}
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-usco-vino" />
                    Fin: {formatDate(examen.fecha_fin)}
                  </p>
                </div>

                {!intento && (
                  <>
                    <button
                      type="button"
                      onClick={() => iniciarIntentoMutation.mutate(String(examen.id))}
                      disabled={iniciarIntentoMutation.isPending}
                      className="mt-6 inline-flex items-center justify-center rounded-xl bg-usco-vino px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#741017] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {iniciarIntentoMutation.isPending &&
                      iniciarIntentoMutation.variables === String(examen.id)
                        ? 'Iniciando...'
                        : 'Iniciar Simulacro'}
                    </button>
                    {inicioError?.examenId === String(examen.id) && (
                      <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {inicioError.message}
                      </p>
                    )}
                  </>
                )}

                {intento?.estado === 'En Progreso' && (
                  <button
                    type="button"
                    onClick={() => navigate(`/evaluaciones/intento/${intento.id}`)}
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-usco-ocre px-4 py-2.5 text-sm font-semibold text-usco-vino shadow-sm transition hover:-translate-y-0.5 hover:brightness-95 hover:shadow-md"
                  >
                    Continuar Simulacro
                  </button>
                )}

                {(intento?.estado === 'Finalizado' ||
                  intento?.estado === 'Pendiente Calificacion') && (
                  <button
                    type="button"
                    onClick={() => navigate(`/evaluaciones/intento/${intento.id}/resultados`)}
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-usco-gris px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-95 hover:shadow-md"
                  >
                    Ver Resultados
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}

      {iniciarIntentoMutation.isError && !inicioError?.examenId && (
        <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {mutationErrorMessage}
        </div>
      )}
    </section>
  )
}

export default EvaluacionesPage
