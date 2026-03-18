import { useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import estudianteService from '../services/estudianteService'
import type { RespuestaEstudiante } from '../../../types/evaluaciones'

interface ApiErrorResponse {
  detail?: string
}

interface ModuloResumen {
  moduloId: number
  nombre: string
  totalPreguntas: number
  respondidas: number
  progreso: number
}

const ModulosIntentoPage = () => {
  const { intentoId } = useParams<{ intentoId: string }>()
  const navigate = useNavigate()
  const [isFinalizarDialogOpen, setIsFinalizarDialogOpen] = useState(false)

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

  const modulos = useMemo<ModuloResumen[]>(() => {
    const grouped = new Map<number, ModuloResumen>()

    respuestas.forEach((respuesta) => {
      const moduloId = respuesta.pregunta.modulo_id
      const existing = grouped.get(moduloId)

      if (existing) {
        existing.totalPreguntas += 1
        if (respuesta.opcion_seleccionada !== null) {
          existing.respondidas += 1
        }
        existing.progreso = Math.round((existing.respondidas / existing.totalPreguntas) * 100)
        return
      }

      const respondidasInicial = respuesta.opcion_seleccionada !== null ? 1 : 0

      grouped.set(moduloId, {
        moduloId,
        nombre: respuesta.pregunta.modulo_nombre,
        totalPreguntas: 1,
        respondidas: respondidasInicial,
        progreso: Math.round((respondidasInicial / 1) * 100),
      })
    })

    return Array.from(grouped.values())
  }, [respuestas])

  const progresoGeneral = useMemo<number>(() => {
    if (modulos.length === 0) {
      return 0
    }

    const totalPreguntas = modulos.reduce((acc, modulo) => acc + modulo.totalPreguntas, 0)
    const totalRespondidas = modulos.reduce((acc, modulo) => acc + modulo.respondidas, 0)

    if (totalPreguntas === 0) {
      return 0
    }

    return Math.round((totalRespondidas / totalPreguntas) * 100)
  }, [modulos])

  const errorMessage = error?.response?.data?.detail ?? 'No fue posible cargar los modulos del intento.'

  const finalizarIntentoMutation = useMutation<{ estado: string }, AxiosError<ApiErrorResponse>, string>(
    {
      mutationFn: estudianteService.finalizarIntento,
      onSuccess: () => {
        if (intentoId) {
          localStorage.removeItem(`simulacro_estado_${intentoId}`)
        }
        navigate(`/evaluaciones/intento/${intentoId}/resultados`)
      },
    },
  )

  const handleFinalizarIntento = () => {
    if (!intentoId) {
      return
    }

    setIsFinalizarDialogOpen(false)
    finalizarIntentoMutation.mutate(intentoId)
  }

  if (!intentoId) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        Intento no valido.
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <header className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-usco-vino sm:text-3xl">
          Modulos del Simulacro
        </h1>
        <p className="mt-2 text-sm text-usco-gris">
          Selecciona un modulo para continuar con la presentacion del examen.
        </p>
      </header>

      {isLoading && (
        <div className="rounded-xl border border-usco-ocre/80 bg-white p-6 shadow-sm">
          <SaberProLoader mensaje="Cargando modulos..." />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {!isLoading && !isError && modulos.length === 0 && (
        <div className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
          Este intento no tiene modulos disponibles.
        </div>
      )}

      {!isLoading && !isError && modulos.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
            {modulos.map((modulo) => (
              <article
                key={modulo.moduloId}
                className="rounded-2xl border border-usco-ocre/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <h2 className="text-xl font-bold leading-tight text-usco-vino">{modulo.nombre}</h2>
                <p className="mt-2 text-sm text-usco-gris">
                  Respondidas {modulo.respondidas} de {modulo.totalPreguntas}
                </p>

                <div className="mt-4 h-2.5 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2.5 rounded-full bg-usco-vino"
                    style={{ width: `${modulo.progreso}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-usco-gris">{modulo.progreso}% completado</p>

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/evaluaciones/intento/${intentoId}/modulo/${modulo.moduloId}`)
                  }
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-usco-vino px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#741017] hover:shadow-md"
                >
                  Ingresar al Modulo
                </button>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-usco-gris/80">
                Progreso general
              </p>
              <p className="text-sm text-usco-gris">
                {progresoGeneral}% completado en todos los modulos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsFinalizarDialogOpen(true)}
              disabled={finalizarIntentoMutation.isPending}
              className="inline-flex w-full items-center justify-center rounded-xl bg-usco-vino px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#741017] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-[220px]"
            >
              {finalizarIntentoMutation.isPending ? 'Finalizando...' : 'Finalizar Simulacro'}
            </button>

            {finalizarIntentoMutation.isError && (
              <p className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {finalizarIntentoMutation.error?.response?.data?.detail ??
                  'No fue posible finalizar el intento.'}
              </p>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={isFinalizarDialogOpen}
        title="Finalizar simulacro"
        message="Estas seguro de finalizar? Ya no podras cambiar tus respuestas."
        confirmText="Si, finalizar"
        cancelText="Cancelar"
        isLoading={finalizarIntentoMutation.isPending}
        onCancel={() => setIsFinalizarDialogOpen(false)}
        onConfirm={handleFinalizarIntento}
      />
    </section>
  )
}

export default ModulosIntentoPage
