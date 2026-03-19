import { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, CheckCircle, CircleDashed, Edit, Eye, Trash2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import VisualizarPreguntaModal from '../components/VisualizarPreguntaModal'
import preguntasService from '../services/preguntasService'
import type { Modulo, Pregunta } from '../../../types/preguntas'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const getModuloNombre = (pregunta: Pregunta): string => {
  if (!pregunta) {
    return 'General'
  }

  if (pregunta.modulo_nombre) {
    return pregunta.modulo_nombre
  }

  if (typeof pregunta.modulo === 'object' && pregunta.modulo !== null) {
    return (pregunta.modulo as Modulo).nombre
  }

  if (pregunta.modulo_id) {
    return `Modulo ${pregunta.modulo_id}`
  }

  return `Modulo ${String(pregunta.modulo)}`
}

const getTipoBadge = (tipo: string) => {
  if ((tipo ?? '').trim() === 'Ensayo') {
    return 'bg-orange-100 text-orange-800'
  }

  return 'bg-blue-100 text-blue-800'
}

const getDificultadBadge = (dificultad: string) => {
  const normalized = (dificultad ?? '').trim()

  if (normalized === 'Facil' || normalized === 'Fácil') {
    return 'bg-green-100 text-green-800'
  }

  if (normalized === 'Media' || normalized === 'Medio') {
    return 'bg-yellow-100 text-yellow-800'
  }

  return 'bg-red-100 text-red-800'
}

const PreguntasModuloPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { moduloNombre } = useParams()
  const moduloActual = safeDecode(moduloNombre ?? 'General')
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false)
  const [preguntaViendo, setPreguntaViendo] = useState<Pregunta | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(
    null,
  )

  const { data, isLoading, isError, error } = useQuery<Pregunta[], AxiosError<ApiErrorResponse>>({
    queryKey: ['preguntas', mostrarArchivadas],
    queryFn: () => preguntasService.getPreguntas(mostrarArchivadas),
  })

  const preguntas = data ?? []

  const cambiarEstadoMutation = useMutation({
    mutationFn: preguntasService.cambiarEstadoPregunta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preguntas'] })
    },
  })

  const preguntasModulo = useMemo(
    () =>
      preguntas.filter(
        (pregunta) => getModuloNombre(pregunta).toLowerCase() === moduloActual.toLowerCase(),
      ),
    [preguntas, moduloActual],
  )

  useEffect(() => {
    const state = location.state as { notification?: { type: 'success' | 'info'; message: string } } | null
    if (!state?.notification) {
      return
    }

    setNotification(state.notification)
    navigate(location.pathname, { replace: true })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!notification) {
      return
    }

    const timeoutId = window.setTimeout(() => setNotification(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [notification])

  if (isLoading) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
        Cargando preguntas del modulo...
      </section>
    )
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error.response?.data?.detail ??
          error.response?.data?.detalle ??
          'No fue posible cargar las preguntas del modulo.'}
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate('/preguntas')}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-usco-gris/30 px-3 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Modulos
        </button>
        <h1 className="text-3xl font-bold text-usco-vino">Preguntas de: {moduloActual}</h1>
      </header>

      {notification && (
        <section
          className={`rounded-xl border p-4 text-sm shadow-sm ${
            notification.type === 'success'
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-blue-300 bg-blue-50 text-blue-800'
          }`}
        >
          {notification.message}
        </section>
      )}

      <div className="flex justify-end">
        <label className="flex cursor-pointer items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200">
          <input
            type="checkbox"
            checked={mostrarArchivadas}
            onChange={(event) => setMostrarArchivadas(event.target.checked)}
            className="rounded text-gray-600 focus:ring-gray-500"
          />
          <Archive className="h-4 w-4" />
          Mostrar Historial (Archivadas)
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-usco-ocre/80 bg-white shadow-md sm:rounded-lg">
        <table className="w-full min-w-[860px]">
          <thead className="bg-usco-fondo">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                Enunciado
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                Tipo
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                Dificultad
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
            {preguntasModulo.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-usco-gris">
                  No hay preguntas registradas para este modulo.
                </td>
              </tr>
            )}

            {preguntasModulo.map((pregunta, index) => (
              <tr key={String(pregunta.id)} className={index % 2 === 0 ? 'bg-white' : 'bg-usco-fondo/40'}>
                <td className="px-4 py-3 text-sm text-usco-gris">
                  <div className="max-w-xs truncate" title={String(pregunta.enunciado ?? '')}>
                    {String(pregunta.enunciado ?? '')}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getTipoBadge(
                      pregunta.tipo_pregunta,
                    )}`}
                  >
                    {pregunta.tipo_pregunta}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getDificultadBadge(
                      pregunta.dificultad,
                    )}`}
                  >
                    {pregunta.dificultad}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {pregunta.estado === 'Publicada' ? (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                      Publicada
                    </span>
                  ) : pregunta.estado === 'Archivada' ? (
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                      Archivada
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-600">
                      Borrador
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-3 text-usco-gris">
                    {pregunta.estado === 'Archivada' ? (
                      <button
                        type="button"
                        onClick={() => setPreguntaViendo(pregunta)}
                        className="rounded-md p-1.5 text-gray-500 transition hover:bg-usco-fondo hover:text-usco-vino"
                        title="Ver pregunta archivada"
                        aria-label="Ver pregunta archivada"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreguntaViendo(pregunta)}
                          className="rounded-md p-1.5 transition hover:bg-usco-fondo hover:text-blue-600"
                          title="Ver pregunta"
                          aria-label="Ver pregunta"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/preguntas/${pregunta.id}/editar`)}
                          className="rounded-md p-1.5 transition hover:bg-usco-fondo hover:text-usco-vino"
                          aria-label="Editar pregunta"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            cambiarEstadoMutation.mutate({
                              id: pregunta.id,
                              estado: pregunta.estado === 'Publicada' ? 'Borrador' : 'Publicada',
                            })
                          }
                          className={`rounded-md p-1.5 transition ${
                            pregunta.estado === 'Publicada'
                              ? 'text-green-600 hover:bg-green-50 hover:text-green-800'
                              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                          }`}
                          title={
                            pregunta.estado === 'Publicada'
                              ? 'Pasar a Borrador'
                              : 'Publicar Pregunta'
                          }
                          aria-label="Cambiar estado de pregunta"
                        >
                          {pregunta.estado === 'Publicada' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <CircleDashed className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 transition hover:bg-usco-fondo hover:text-red-600"
                          aria-label="Eliminar pregunta"
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

      {cambiarEstadoMutation.isError && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          No fue posible actualizar el estado de la pregunta.
        </section>
      )}

      <VisualizarPreguntaModal
        isOpen={Boolean(preguntaViendo)}
        onClose={() => setPreguntaViendo(null)}
        pregunta={preguntaViendo}
      />
    </section>
  )
}

export default PreguntasModuloPage
