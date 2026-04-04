import { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle,
  CircleDashed,
  Clock3,
  Edit,
  Eye,
  Filter,
  GitMerge,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CargaMasivaPreguntasModal from '../components/CargaMasivaPreguntasModal'
import CompararPreguntasModal from '../components/CompararPreguntasModal'
import VisualizarPreguntaModal from '../components/VisualizarPreguntaModal'
import preguntasService, { type CargaMasivaPreguntasResponse } from '../services/preguntasService'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import RichTextRenderer from '../../../components/ui/RichTextRenderer'
import type { Modulo, Pregunta } from '../../../types/preguntas'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

const ULTIMO_LOTE_STORAGE_KEY = 'preguntas_carga_masiva_ultimo_lote'
const PAGE_SIZE = 10

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
    return `Módulo ${pregunta.modulo_id}`
  }

  return `Módulo ${String(pregunta.modulo)}`
}

const getTipoBadge = (tipo: string) => {
  if ((tipo ?? '').trim() === 'Ensayo') {
    return 'bg-orange-100 text-orange-800'
  }

  return 'bg-gray-100 text-gray-700'
}

const formatTipoLabel = (tipo: string) => {
  const normalized = (tipo ?? '').trim().toLowerCase()
  if (normalized === 'opcion multiple') return 'Opcion Multiple'
  if (normalized === 'ensayo') return 'Ensayo'
  return tipo || 'N/A'
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

const normalizeDificultad = (dificultad: string): 'FACIL' | 'MEDIA' | 'ALTA' => {
  const normalized = (dificultad ?? '').trim().toLowerCase()
  if (normalized === 'facil' || normalized === 'fácil') return 'FACIL'
  if (normalized === 'media' || normalized === 'medio') return 'MEDIA'
  return 'ALTA'
}

const formatFecha = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const formatEstadoLabel = (estado?: string) => {
  if (estado === 'Publicada') return 'Publicada'
  if (estado === 'Archivada') return 'Archivada'
  return 'Borrador'
}

const PreguntasModuloPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { moduloNombre } = useParams()
  const moduloActual = safeDecode(moduloNombre ?? 'General')
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false)
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  const [modalCompararOpen, setModalCompararOpen] = useState(false)
  const [isCargaMasivaOpen, setIsCargaMasivaOpen] = useState(false)
  const [ultimoLote, setUltimoLote] = useState<string | null>(null)
  const [lotePendienteRevertir, setLotePendienteRevertir] = useState<string | null>(null)
  const [preguntaPendienteEliminar, setPreguntaPendienteEliminar] = useState<Pregunta | null>(null)
  const [resumenUltimoLote, setResumenUltimoLote] = useState<{
    preguntasCreadas: number
    filasConIA: number
  } | null>(null)
  const [preguntaViendo, setPreguntaViendo] = useState<Pregunta | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<'Todas' | 'Publicada' | 'Borrador' | 'Archivada'>(
    'Publicada',
  )
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'Opcion Multiple' | 'Ensayo'>('Todos')
  const [ordenFiltro, setOrdenFiltro] = useState<
    'recientes' | 'antiguas' | 'dificultad' | 'enunciado_az'
  >('recientes')
  const [currentPage, setCurrentPage] = useState(1)
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(
    null,
  )

  const { data, isLoading, isError, error } = useQuery<Pregunta[], AxiosError<ApiErrorResponse>>({
    queryKey: ['preguntas', mostrarArchivadas],
    queryFn: () => preguntasService.getPreguntas(mostrarArchivadas),
  })
  const { data: modulos = [] } = useQuery<Modulo[]>({
    queryKey: ['modulos'],
    queryFn: () => preguntasService.getModulos(),
  })

  const preguntas = data ?? []

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const raw = window.localStorage.getItem(ULTIMO_LOTE_STORAGE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as {
        loteId?: string
        preguntasCreadas?: number
        filasConIA?: number
      }

      if (!parsed?.loteId) {
        return
      }

      setUltimoLote(parsed.loteId)
      setResumenUltimoLote({
        preguntasCreadas: Number(parsed.preguntasCreadas ?? 0),
        filasConIA: Number(parsed.filasConIA ?? 0),
      })
    } catch {
      // noop
    }
  }, [])

  const cambiarEstadoMutation = useMutation({
    mutationFn: preguntasService.cambiarEstadoPregunta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preguntas'] })
    },
  })

  const revertirCargaMutation = useMutation({
    mutationFn: preguntasService.revertirCargaMasiva,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['preguntas'] })
      setUltimoLote(null)
      setResumenUltimoLote(null)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ULTIMO_LOTE_STORAGE_KEY)
      }
      setNotification({
        type: 'success',
        message:
          response?.mensaje ??
          `Se eliminó la carga masiva (${response?.cantidad_eliminada ?? 0} pregunta(s)).`,
      })
    },
    onError: () => {
      setNotification({
        type: 'info',
        message: 'No fue posible deshacer la carga masiva en este momento.',
      })
    },
  })

  const eliminarPreguntaMutation = useMutation({
    mutationFn: preguntasService.eliminarPregunta,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['preguntas'] })
      const tipoEliminacion = response?.tipo_eliminacion
      const mensajeFallback =
        tipoEliminacion === 'fisica'
          ? 'Pregunta eliminada permanentemente.'
          : 'Pregunta archivada correctamente.'
      setNotification({
        type: 'success',
        message: response?.mensaje ?? mensajeFallback,
      })
    },
    onError: () => {
      setNotification({
        type: 'info',
        message: 'No fue posible eliminar la pregunta en este momento.',
      })
    },
  })

  const preguntasModulo = useMemo(
    () =>
      preguntas.filter(
        (pregunta) => getModuloNombre(pregunta).toLowerCase() === moduloActual.toLowerCase(),
      ),
    [preguntas, moduloActual],
  )

  const preguntasFiltradas = useMemo(() => {
    const texto = searchTerm.trim().toLowerCase()

    const filtered = preguntasModulo.filter((pregunta) => {
      if (estadoFiltro !== 'Todas' && formatEstadoLabel(pregunta.estado) !== estadoFiltro) {
        return false
      }
      if (tipoFiltro !== 'Todos' && (pregunta.tipo_pregunta ?? '').trim() !== tipoFiltro) {
        return false
      }
      if (!texto) return true
      return String(pregunta.enunciado ?? '').toLowerCase().includes(texto)
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      if (ordenFiltro === 'enunciado_az') {
        return String(a.enunciado ?? '').localeCompare(String(b.enunciado ?? ''), 'es')
      }

      if (ordenFiltro === 'dificultad') {
        const weight = { FACIL: 1, MEDIA: 2, ALTA: 3 }
        return weight[normalizeDificultad(a.dificultad)] - weight[normalizeDificultad(b.dificultad)]
      }

      const dateA = new Date((a as Pregunta & { created_at?: string }).created_at ?? '').getTime()
      const dateB = new Date((b as Pregunta & { created_at?: string }).created_at ?? '').getTime()
      const safeA = Number.isNaN(dateA) ? 0 : dateA
      const safeB = Number.isNaN(dateB) ? 0 : dateB

      return ordenFiltro === 'antiguas' ? safeA - safeB : safeB - safeA
    })

    return sorted
  }, [preguntasModulo, searchTerm, estadoFiltro, tipoFiltro, ordenFiltro])

  const preguntasSeleccionadas = useMemo(() => {
    const lookup = new Set(seleccionadas)
    return preguntas.filter((pregunta) => lookup.has(String(pregunta.id)))
  }, [preguntas, seleccionadas])

  const totalFiltradas = preguntasFiltradas.length
  const totalPages = Math.max(1, Math.ceil(totalFiltradas / PAGE_SIZE))

  const preguntasPaginadas = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return preguntasFiltradas.slice(start, start + PAGE_SIZE)
  }, [currentPage, preguntasFiltradas])

  const moduloPreseleccionado = useMemo(() => {
    if (preguntasModulo.length > 0 && preguntasModulo[0].modulo_id) {
      return Number(preguntasModulo[0].modulo_id)
    }

    const match = modulos.find(
      (modulo) => modulo.nombre.toLowerCase() === moduloActual.toLowerCase(),
    )
    return match?.id ?? null
  }, [preguntasModulo, modulos, moduloActual])

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

  useEffect(() => {
    setSeleccionadas((prev) =>
      prev.filter((id) => preguntas.some((pregunta) => String(pregunta.id) === id)),
    )
  }, [preguntas])

  useEffect(() => {
    if (seleccionadas.length !== 2) {
      setModalCompararOpen(false)
    }
  }, [seleccionadas.length])

  useEffect(() => {
    setCurrentPage(1)
  }, [moduloActual, searchTerm, estadoFiltro, tipoFiltro, ordenFiltro, mostrarArchivadas])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const toggleSeleccion = (preguntaId: string) => {
    setSeleccionadas((prev) => {
      const yaSeleccionada = prev.includes(preguntaId)

      if (yaSeleccionada) {
        return prev.filter((id) => id !== preguntaId)
      }

      if (prev.length >= 2) {
        setNotification({
          type: 'info',
          message: 'Solo puedes seleccionar 2 preguntas para comparar.',
        })
        return prev
      }

      return [...prev, preguntaId]
    })
  }

  const todosSeleccionados =
    preguntasPaginadas.length > 0 &&
    preguntasPaginadas.every((pregunta) => seleccionadas.includes(String(pregunta.id)))

  const toggleSeleccionTodos = () => {
    const idsFiltrados = preguntasPaginadas.map((pregunta) => String(pregunta.id))

    if (todosSeleccionados) {
      setSeleccionadas((prev) => prev.filter((id) => !idsFiltrados.includes(id)))
      return
    }

    if (idsFiltrados.length > 2) {
      setNotification({
        type: 'info',
        message: 'Solo puedes seleccionar hasta 2 preguntas para comparar.',
      })
      return
    }

    setSeleccionadas((prev) => {
      const unique = new Set(prev)
      idsFiltrados.forEach((id) => unique.add(id))
      return Array.from(unique).slice(0, 2)
    })
  }

  const handleCargaMasivaSuccess = (response: CargaMasivaPreguntasResponse) => {
    if (response.lote_id) {
      setUltimoLote(response.lote_id)
      setResumenUltimoLote({
        preguntasCreadas: response.preguntas_creadas,
        filasConIA: response.filas_con_ia,
      })
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          ULTIMO_LOTE_STORAGE_KEY,
          JSON.stringify({
            loteId: response.lote_id,
            preguntasCreadas: response.preguntas_creadas,
            filasConIA: response.filas_con_ia,
            createdAt: Date.now(),
          }),
        )
      }
      return
    }

    setUltimoLote(null)
    setResumenUltimoLote(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ULTIMO_LOTE_STORAGE_KEY)
    }
  }

  const handleRevertirCarga = (loteId: string) => {
    if (!loteId) {
      return
    }
    setLotePendienteRevertir(loteId)
  }

  const confirmarReversionLote = () => {
    if (!lotePendienteRevertir) {
      return
    }
    const loteId = lotePendienteRevertir
    setLotePendienteRevertir(null)
    revertirCargaMutation.mutate(loteId)
  }

  const confirmarEliminarPregunta = () => {
    if (!preguntaPendienteEliminar) {
      return
    }

    const preguntaId = preguntaPendienteEliminar.id
    setPreguntaPendienteEliminar(null)
    eliminarPreguntaMutation.mutate(preguntaId)
  }

  if (isLoading) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
        Cargando preguntas del módulo...
      </section>
    )
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error.response?.data?.detail ??
          error.response?.data?.detalle ??
          'No fue posible cargar las preguntas del módulo.'}
      </section>
    )
  }

  return (
    <section className="bank-scope mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate('/preguntas')}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-usco-gris/30 px-3 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Módulos
        </button>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-usco-vino">Preguntas de: {moduloActual}</h1>
            <p className="mt-1 text-sm text-usco-gris/85">
              {preguntasModulo.length} preguntas · Selecciona 2 para comparar versiones
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCargaMasivaOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-usco-gris/30 bg-white px-4 py-2.5 text-sm font-semibold text-usco-gris shadow-sm transition hover:border-usco-vino hover:text-usco-vino"
            >
              <Upload className="h-4 w-4" />
              Carga Masiva
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/preguntas/nueva', { state: { moduloPreseleccionado: moduloActual } })
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-usco-vino px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#741017]"
            >
              <Plus className="h-4 w-4" />
              Nueva Pregunta
            </button>
          </div>
        </div>
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

      {ultimoLote && (
        <section className="flex flex-col gap-3 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4 text-sm text-yellow-800 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            Carga masiva completada
            {resumenUltimoLote
              ? ` (${resumenUltimoLote.preguntasCreadas} preguntas, ${resumenUltimoLote.filasConIA} filas con IA).`
              : '.'}{' '}
            ¿Subiste el archivo equivocado?
          </p>
          <button
            type="button"
            onClick={() => handleRevertirCarga(ultimoLote)}
            disabled={revertirCargaMutation.isPending}
            className="font-bold text-red-700 underline transition hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {revertirCargaMutation.isPending ? 'Revirtiendo...' : 'Deshacer última carga'}
          </button>
        </section>
      )}

      <section className="rounded-2xl border border-usco-ocre/70 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <label className="relative xl:col-span-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-usco-gris/70" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por enunciado..."
              className="w-full rounded-xl border border-usco-ocre/80 py-2.5 pl-11 pr-3 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
            />
          </label>

          <label className="relative xl:col-span-2">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-usco-gris/70" />
            <select
              value={estadoFiltro}
              onChange={(event) =>
                setEstadoFiltro(event.target.value as 'Todas' | 'Publicada' | 'Borrador' | 'Archivada')
              }
              className="w-full rounded-xl border border-usco-ocre/80 bg-white py-2.5 pl-9 pr-3 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
            >
              <option value="Todas">Todas</option>
              <option value="Publicada">Publicada</option>
              <option value="Borrador">Borrador</option>
              <option value="Archivada">Archivada</option>
            </select>
          </label>

          <label className="relative xl:col-span-2">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-usco-gris/70" />
            <select
              value={tipoFiltro}
              onChange={(event) => setTipoFiltro(event.target.value as 'Todos' | 'Opcion Multiple' | 'Ensayo')}
              className="w-full rounded-xl border border-usco-ocre/80 bg-white py-2.5 pl-9 pr-3 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
            >
              <option value="Todos">Todos</option>
              <option value="Opcion Multiple">Opcion Multiple</option>
              <option value="Ensayo">Ensayo</option>
            </select>
          </label>

          <label className="relative xl:col-span-2">
            <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-usco-gris/70" />
            <select
              value={ordenFiltro}
              onChange={(event) =>
                setOrdenFiltro(
                  event.target.value as 'recientes' | 'antiguas' | 'dificultad' | 'enunciado_az',
                )
              }
              className="w-full rounded-xl border border-usco-ocre/80 bg-white py-2.5 pl-9 pr-3 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
            >
              <option value="recientes">Recientes</option>
              <option value="antiguas">Antiguas</option>
              <option value="dificultad">Por dificultad</option>
              <option value="enunciado_az">Enunciado A-Z</option>
            </select>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 px-1 py-2.5 text-sm font-medium text-usco-gris xl:col-span-2 xl:justify-end">
            <input
              type="checkbox"
              checked={mostrarArchivadas}
              onChange={(event) => setMostrarArchivadas(event.target.checked)}
              className="h-5 w-5 shrink-0 rounded-md border-2 border-red-400 text-usco-vino focus:ring-usco-vino"
            />
            <span className="whitespace-nowrap leading-none">Mostrar archivadas</span>
          </label>
        </div>
      </section>

      {seleccionadas.length === 2 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setModalCompararOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3f6fb6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#315896]"
          >
            <GitMerge className="h-4 w-4" />
            Comparar Seleccionadas
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-usco-ocre/80 bg-white shadow-md sm:rounded-lg">
        <table className="w-full min-w-[1060px]">
          <thead className="bg-usco-fondo">
            <tr>
              <th className="w-12 px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  onChange={toggleSeleccionTodos}
                  className="h-4 w-4 rounded border-usco-gris/30 text-usco-vino focus:ring-usco-vino"
                  aria-label="Seleccionar visibles"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                <span className="inline-flex items-center gap-1">
                  Enunciado <ArrowUpDown className="h-3.5 w-3.5" />
                </span>
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                Tipo
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                <span className="inline-flex items-center gap-1">
                  Dificultad <ArrowUpDown className="h-3.5 w-3.5" />
                </span>
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                Estado
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                Fecha
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-usco-ocre/50">
            {preguntasFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-usco-gris">
                  No hay preguntas que coincidan con los filtros aplicados.
                </td>
              </tr>
            )}

            {preguntasPaginadas.map((pregunta) => (
              <tr key={String(pregunta.id)} className="bg-white transition hover:bg-usco-fondo/60">
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={seleccionadas.includes(String(pregunta.id))}
                    onChange={() => toggleSeleccion(String(pregunta.id))}
                    disabled={
                      seleccionadas.length >= 2 && !seleccionadas.includes(String(pregunta.id))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-usco-vino focus:ring-usco-vino disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Seleccionar pregunta ${pregunta.id}`}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-usco-gris">
                  <div className="max-w-[520px] line-clamp-2 font-medium" title={String(pregunta.enunciado ?? '')}>
                    <RichTextRenderer
                      content={String(pregunta.enunciado ?? '')}
                      className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex min-w-[120px] justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${getTipoBadge(
                      pregunta.tipo_pregunta,
                    )}`}
                  >
                    {formatTipoLabel(pregunta.tipo_pregunta)}
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
                <td className="px-4 py-3 text-center text-sm text-usco-gris/80">
                  {formatFecha((pregunta as Pregunta & { created_at?: string }).created_at)}
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
                          onClick={() => setPreguntaPendienteEliminar(pregunta)}
                          disabled={eliminarPreguntaMutation.isPending}
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

      <div className="flex flex-col gap-3 rounded-2xl border border-usco-ocre/80 bg-white px-4 py-3 text-sm text-usco-gris shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          Mostrando {preguntasPaginadas.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} -{' '}
          {(currentPage - 1) * PAGE_SIZE + preguntasPaginadas.length} de {totalFiltradas} preguntas.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-usco-gris/30 px-3 py-1.5 font-medium text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
            <span className="px-2 font-semibold text-usco-vino">
              Página {currentPage} de {totalPages}
            </span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg border border-usco-gris/30 px-3 py-1.5 font-medium text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      {cambiarEstadoMutation.isError && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          No fue posible actualizar el estado de la pregunta.
        </section>
      )}

      {eliminarPreguntaMutation.isError && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          No fue posible eliminar la pregunta.
        </section>
      )}

      <VisualizarPreguntaModal
        isOpen={Boolean(preguntaViendo)}
        onClose={() => setPreguntaViendo(null)}
        pregunta={preguntaViendo}
      />

      <CompararPreguntasModal
        isOpen={modalCompararOpen && preguntasSeleccionadas.length === 2}
        onClose={() => setModalCompararOpen(false)}
        preguntaA={preguntasSeleccionadas[0] ?? null}
        preguntaB={preguntasSeleccionadas[1] ?? null}
      />

      <CargaMasivaPreguntasModal
        isOpen={isCargaMasivaOpen}
        onClose={() => setIsCargaMasivaOpen(false)}
        modulos={modulos}
        moduloPreseleccionado={moduloPreseleccionado}
        onUploadSuccess={handleCargaMasivaSuccess}
      />

      <ConfirmDialog
        open={Boolean(lotePendienteRevertir)}
        title="Deshacer ultima carga masiva"
        message="Se eliminaran todas las preguntas creadas en ese lote. Esta accion no se puede deshacer."
        confirmText="Deshacer carga"
        cancelText="Cancelar"
        isLoading={revertirCargaMutation.isPending}
        onConfirm={confirmarReversionLote}
        onCancel={() => setLotePendienteRevertir(null)}
      />

      <ConfirmDialog
        open={Boolean(preguntaPendienteEliminar)}
        title="Eliminar pregunta"
        message="Si la pregunta ya fue utilizada, se archivara para conservar trazabilidad. Si no ha sido utilizada, se eliminara permanentemente de la base de datos."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={eliminarPreguntaMutation.isPending}
        onConfirm={confirmarEliminarPregunta}
        onCancel={() => setPreguntaPendienteEliminar(null)}
      />
    </section>
  )
}

export default PreguntasModuloPage

