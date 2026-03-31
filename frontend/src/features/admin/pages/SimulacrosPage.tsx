import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, BarChart2, Edit, Eye, Lock, Trash2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import simulacrosService from '../services/simulacrosService'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import type { PlantillaExamen } from '../../../types/evaluaciones'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

interface ConfirmActionState {
  type: 'delete' | 'archive'
  id: string | number
}

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no valida'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const SimulacrosPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [successMessage, setSuccessMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [mostrarArchivados, setMostrarArchivados] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null)

  const { data, isLoading, isError, error } = useQuery<PlantillaExamen[], AxiosError<ApiErrorResponse>>({
    queryKey: ['simulacros', mostrarArchivados],
    queryFn: () => simulacrosService.getSimulacros(mostrarArchivados),
  })

  const eliminarSimulacroMutation = useMutation({
    mutationFn: simulacrosService.eliminarSimulacro,
    onSuccess: () => {
      setActionError('')
      setSuccessMessage('Simulacro eliminado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['simulacros'] })
    },
    onError: (mutationError: AxiosError<ApiErrorResponse>) => {
      setActionError(
        mutationError.response?.data?.detail ??
          mutationError.response?.data?.detalle ??
          'No fue posible eliminar el simulacro.',
      )
    },
  })

  const archivarSimulacroMutation = useMutation({
    mutationFn: simulacrosService.archivarSimulacro,
    onSuccess: (response) => {
      setActionError('')
      setSuccessMessage(response.detail ?? 'Simulacro archivado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['simulacros'] })
    },
    onError: (mutationError: AxiosError<ApiErrorResponse>) => {
      setActionError(
        mutationError.response?.data?.detail ??
          mutationError.response?.data?.detalle ??
          'No fue posible archivar el simulacro.',
      )
    },
  })

  useEffect(() => {
    const state = location.state as { successMessage?: string } | null
    if (state?.successMessage) {
      setSuccessMessage(state.successMessage)
      navigate(location.pathname, { replace: true })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!successMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => setSuccessMessage(''), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

  if (isLoading) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
        Cargando simulacros...
      </section>
    )
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error.response?.data?.detail ??
          error.response?.data?.detalle ??
          'No fue posible cargar los simulacros.'}
      </section>
    )
  }

  const simulacros = data ?? []

  const handleEliminar = (id: string | number) => {
    setConfirmAction({ type: 'delete', id })
  }

  const handleArchivar = (id: string | number) => {
    setConfirmAction({ type: 'archive', id })
  }

  const handleConfirmAction = () => {
    if (!confirmAction) {
      return
    }

    const actionToRun = confirmAction
    setConfirmAction(null)

    if (actionToRun.type === 'delete') {
      eliminarSimulacroMutation.mutate(actionToRun.id)
      return
    }

    archivarSimulacroMutation.mutate(actionToRun.id)
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-usco-vino">Gestion de Simulacros</h1>
        <button
          type="button"
          onClick={() => navigate('/simulacros/nuevo')}
          className="inline-flex items-center justify-center rounded-xl bg-usco-vino px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#741017]"
        >
          + Nuevo Simulacro
        </button>
      </header>

      {successMessage && (
        <section className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800 shadow-sm">
          {successMessage}
        </section>
      )}

      {actionError && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {actionError}
        </section>
      )}

      <label className="flex w-max cursor-pointer items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200">
        <input
          type="checkbox"
          checked={mostrarArchivados}
          onChange={(event) => setMostrarArchivados(event.target.checked)}
          className="rounded text-gray-600 focus:ring-gray-500"
        />
        Mostrar Historial (Archivados)
      </label>

      <div className="overflow-x-auto rounded-2xl border border-usco-ocre/80 bg-white shadow-md sm:rounded-lg">
        <table className="w-full min-w-[920px]">
          <thead className="bg-usco-fondo">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                Titulo
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                Fechas
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                Duracion
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                Estado
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {simulacros.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-usco-gris">
                  {mostrarArchivados
                    ? 'No hay simulacros archivados en este momento.'
                    : 'No hay simulacros registrados en este momento.'}
                </td>
              </tr>
            )}

            {simulacros.map((simulacro, index) => (
              <tr key={String(simulacro.id)} className={index % 2 === 0 ? 'bg-white' : 'bg-usco-fondo/40'}>
                <td className="px-4 py-3 text-sm font-medium text-usco-gris">{simulacro.titulo}</td>
                <td className="px-4 py-3 text-sm text-usco-gris">
                  {formatDate(simulacro.fecha_inicio)} - {formatDate(simulacro.fecha_fin)}
                </td>
                <td className="px-4 py-3 text-center text-sm text-usco-gris">
                  {simulacro.tiempo_minutos} min
                </td>
                <td className="px-4 py-3 text-center">
                  {simulacro.estado === 'Archivado' ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      Archivado
                    </span>
                  ) : simulacro.activo ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-700">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-3 text-usco-gris">
                    {simulacro.tiene_intentos ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-500"
                          title="Bloqueado: Ya tiene respuestas"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Bloqueado
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/simulacros/editar/${simulacro.id}`)}
                          className="text-gray-600 transition-colors hover:text-usco-vino"
                          title="Ver detalles (Solo lectura)"
                          aria-label="Ver detalles del simulacro"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/simulacros/${simulacro.id}/resultados`)}
                          className="text-green-600 transition-colors hover:text-green-800"
                          title="Ver resultados"
                          aria-label="Ver resultados del simulacro"
                        >
                          <BarChart2 className="h-4.5 w-4.5" />
                        </button>
                        {simulacro.estado !== 'Archivado' && (
                          <button
                            type="button"
                            onClick={() => handleArchivar(simulacro.id)}
                            disabled={archivarSimulacroMutation.isPending}
                            className="text-orange-500 transition-colors hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Archivar Simulacro"
                            aria-label="Archivar simulacro"
                          >
                            <Archive className="h-4.5 w-4.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/simulacros/editar/${simulacro.id}`)}
                          className="rounded-md p-1.5 transition hover:bg-usco-fondo hover:text-usco-vino"
                          aria-label="Editar simulacro"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(simulacro.id)}
                          disabled={eliminarSimulacroMutation.isPending}
                          className="rounded-md p-1.5 transition hover:bg-usco-fondo hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Eliminar simulacro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.type === 'delete' ? 'Eliminar simulacro' : 'Archivar simulacro'}
        message={
          confirmAction?.type === 'delete'
            ? 'Esta accion no se puede deshacer. Se eliminara el simulacro de forma permanente.'
            : 'El simulacro se ocultara de la tabla principal y pasara al historial.'
        }
        confirmText={confirmAction?.type === 'delete' ? 'Eliminar' : 'Archivar'}
        cancelText="Cancelar"
        isLoading={eliminarSimulacroMutation.isPending || archivarSimulacroMutation.isPending}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </section>
  )
}

export default SimulacrosPage
