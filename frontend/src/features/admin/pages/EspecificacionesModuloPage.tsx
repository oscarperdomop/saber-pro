import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Moon, Plus, Sun, Trash2 } from 'lucide-react'
import preguntasService from '../services/preguntasService'
import especificacionesService from '../services/especificacionesService'
import type { Categoria, Competencia } from '../../../types/evaluaciones'
import type { Modulo } from '../../../types/preguntas'
import { isDarkModeEnabled, setDarkModeEnabled } from '../../../lib/theme'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
  [key: string]: unknown
}

const EspecificacionesModuloPage = () => {
  const queryClient = useQueryClient()
  const [moduloSeleccionado, setModuloSeleccionado] = useState<number | ''>('')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [nuevaCompetencia, setNuevaCompetencia] = useState('')
  const [darkModeEnabled, setDarkModeState] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    setDarkModeState(isDarkModeEnabled())
  }, [])

  const getMutationError = (error: unknown) => {
    const axiosError = error as AxiosError<ApiErrorResponse>
    const detail = axiosError.response?.data?.detail ?? axiosError.response?.data?.detalle
    if (detail) {
      return String(detail)
    }
    return 'No fue posible completar la acción solicitada.'
  }

  const {
    data: modulos = [],
    isLoading: isLoadingModulos,
    isError: isErrorModulos,
    error: modulosError,
  } = useQuery<Modulo[], AxiosError<ApiErrorResponse>>({
    queryKey: ['modulos'],
    queryFn: preguntasService.getModulos,
  })

  const {
    data: categorias = [],
    isLoading: isLoadingCategorias,
    isError: isErrorCategorias,
    error: categoriasError,
  } = useQuery<Categoria[], AxiosError<ApiErrorResponse>>({
    queryKey: ['categorias', moduloSeleccionado],
    queryFn: () => especificacionesService.getCategorias(Number(moduloSeleccionado)),
    enabled: Boolean(moduloSeleccionado),
  })

  const {
    data: competencias = [],
    isLoading: isLoadingCompetencias,
    isError: isErrorCompetencias,
    error: competenciasError,
  } = useQuery<Competencia[], AxiosError<ApiErrorResponse>>({
    queryKey: ['competencias', moduloSeleccionado],
    queryFn: () => especificacionesService.getCompetencias(Number(moduloSeleccionado)),
    enabled: Boolean(moduloSeleccionado),
  })

  const crearCategoriaMutation = useMutation({
    mutationFn: especificacionesService.crearCategoria,
    onSuccess: () => {
      setNuevaCategoria('')
      setFeedback({ type: 'success', message: 'Categoría creada correctamente.' })
      queryClient.invalidateQueries({ queryKey: ['categorias', moduloSeleccionado] })
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getMutationError(error) })
    },
  })

  const eliminarCategoriaMutation = useMutation({
    mutationFn: especificacionesService.eliminarCategoria,
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Categoría eliminada correctamente.' })
      queryClient.invalidateQueries({ queryKey: ['categorias', moduloSeleccionado] })
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getMutationError(error) })
    },
  })

  const crearCompetenciaMutation = useMutation({
    mutationFn: especificacionesService.crearCompetencia,
    onSuccess: () => {
      setNuevaCompetencia('')
      setFeedback({ type: 'success', message: 'Competencia creada correctamente.' })
      queryClient.invalidateQueries({ queryKey: ['competencias', moduloSeleccionado] })
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getMutationError(error) })
    },
  })

  const eliminarCompetenciaMutation = useMutation({
    mutationFn: especificacionesService.eliminarCompetencia,
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Competencia eliminada correctamente.' })
      queryClient.invalidateQueries({ queryKey: ['competencias', moduloSeleccionado] })
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getMutationError(error) })
    },
  })

  const errorText =
    modulosError?.response?.data?.detail ??
    modulosError?.response?.data?.detalle ??
    categoriasError?.response?.data?.detail ??
    categoriasError?.response?.data?.detalle ??
    competenciasError?.response?.data?.detail ??
    competenciasError?.response?.data?.detalle

  const handleCrearCategoria = () => {
    if (!moduloSeleccionado || !nuevaCategoria.trim()) {
      return
    }

    crearCategoriaMutation.mutate({
      nombre: nuevaCategoria.trim(),
      modulo_id: Number(moduloSeleccionado),
    })
  }

  const handleCrearCompetencia = () => {
    if (!moduloSeleccionado || !nuevaCompetencia.trim()) {
      return
    }

    crearCompetenciaMutation.mutate({
      nombre: nuevaCompetencia.trim(),
      modulo_id: Number(moduloSeleccionado),
    })
  }

  const toggleDarkMode = () => {
    const nextValue = !darkModeEnabled
    setDarkModeState(nextValue)
    setDarkModeEnabled(nextValue)
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-usco-vino">ESPECIFICACIONES DE LOS MÓDULOS</h1>
        <button
          type="button"
          onClick={toggleDarkMode}
          className="inline-flex items-center gap-2 rounded-xl border border-usco-ocre/80 bg-white px-4 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
          title="Activar o desactivar modo oscuro (fase Banco de Preguntas)"
        >
          {darkModeEnabled ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {darkModeEnabled ? 'Modo Claro' : 'Modo Oscuro'}
        </button>
      </header>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-bold text-gray-700">Seleccionar Módulo:</label>
        <select
          value={moduloSeleccionado}
          onChange={(event) =>
            setModuloSeleccionado(event.target.value ? Number(event.target.value) : '')
          }
          className="w-full rounded border border-gray-300 p-2 focus:ring-usco-vino md:w-1/2"
          disabled={isLoadingModulos}
        >
          <option value="" disabled>
            -- Elige un Módulo --
          </option>
          {modulos.map((modulo) => (
            <option key={modulo.id} value={modulo.id}>
              {modulo.nombre}
            </option>
          ))}
        </select>
      </div>

      {(isErrorModulos || isErrorCategorias || isErrorCompetencias) && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {errorText ?? 'No fue posible cargar la información de especificaciones.'}
        </section>
      )}

      {feedback && (
        <section
          className={`rounded-xl border p-4 text-sm ${
            feedback.type === 'success'
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-red-300 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </section>
      )}

      {moduloSeleccionado !== '' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-usco-ocre/70 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-usco-vino">Categorías o Contenidos</h2>

            <div className="mb-4 flex items-center gap-2">
              <input
                type="text"
                value={nuevaCategoria}
                onChange={(event) => setNuevaCategoria(event.target.value)}
                placeholder="Nueva categoría"
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-usco-vino focus:ring-usco-vino"
              />
              <button
                type="button"
                onClick={handleCrearCategoria}
                disabled={crearCategoriaMutation.isPending || !nuevaCategoria.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-usco-vino text-white transition hover:bg-[#741017] disabled:cursor-not-allowed disabled:opacity-50"
                title="Agregar categoría"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {isLoadingCategorias ? (
              <p className="text-sm text-usco-gris">Cargando categorías...</p>
            ) : (
              <ul className="space-y-2">
                {categorias.length === 0 && (
                  <li className="rounded-lg border border-gray-200 p-3 text-sm text-usco-gris">
                    No hay categorías registradas para este módulo.
                  </li>
                )}
                {categorias.map((categoria) => (
                  <li
                    key={categoria.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                  >
                    <span className="text-sm text-usco-gris">{categoria.nombre}</span>
                    <button
                      type="button"
                      onClick={() => eliminarCategoriaMutation.mutate(categoria.id)}
                      className="rounded p-1 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-usco-ocre/70 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-usco-vino">Competencias</h2>

            <div className="mb-4 flex items-center gap-2">
              <input
                type="text"
                value={nuevaCompetencia}
                onChange={(event) => setNuevaCompetencia(event.target.value)}
                placeholder="Nueva competencia"
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-usco-vino focus:ring-usco-vino"
              />
              <button
                type="button"
                onClick={handleCrearCompetencia}
                disabled={crearCompetenciaMutation.isPending || !nuevaCompetencia.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-usco-vino text-white transition hover:bg-[#741017] disabled:cursor-not-allowed disabled:opacity-50"
                title="Agregar competencia"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {isLoadingCompetencias ? (
              <p className="text-sm text-usco-gris">Cargando competencias...</p>
            ) : (
              <ul className="space-y-2">
                {competencias.length === 0 && (
                  <li className="rounded-lg border border-gray-200 p-3 text-sm text-usco-gris">
                    No hay competencias registradas para este módulo.
                  </li>
                )}
                {competencias.map((competencia) => (
                  <li
                    key={competencia.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                  >
                    <span className="text-sm text-usco-gris">{competencia.nombre}</span>
                    <button
                      type="button"
                      onClick={() => eliminarCompetenciaMutation.mutate(competencia.id)}
                      className="rounded p-1 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                      title="Eliminar competencia"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </section>
  )
}

export default EspecificacionesModuloPage
