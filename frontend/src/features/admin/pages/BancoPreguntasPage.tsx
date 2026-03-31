import { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  Eye,
  FileQuestion,
  Filter,
  Globe,
  MessageSquare,
  Plus,
  Search,
  SortAsc,
  Upload,
  Users2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import CargaMasivaPreguntasModal from '../components/CargaMasivaPreguntasModal'
import VisualizarPreguntaModal from '../components/VisualizarPreguntaModal'
import preguntasService, {
  type CargaMasivaPreguntasResponse,
  type PreguntaCriticaRow,
} from '../services/preguntasService'
import usuariosService from '../services/usuariosService'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import RichTextRenderer from '../../../components/ui/RichTextRenderer'
import type { Programa } from '../../../types/evaluaciones'
import type { Modulo, Pregunta } from '../../../types/preguntas'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

interface ModuloGroup {
  preguntas: Pregunta[]
  stats: {
    total: number
    facil: number
    media: number
    alta: number
  }
}

interface ModuloTheme {
  icon: LucideIcon
  gradient: string
  cardBorder: string
  bgSoft: string
  text: string
  button: string
}

const ULTIMO_LOTE_STORAGE_KEY = 'preguntas_carga_masiva_ultimo_lote'

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

const getDificultadKey = (dificultad: string): 'facil' | 'media' | 'alta' => {
  const normalized = (dificultad ?? '').trim().toLowerCase()

  if (normalized === 'facil' || normalized === 'fácil') {
    return 'facil'
  }

  if (normalized === 'media' || normalized === 'medio') {
    return 'media'
  }

  return 'alta'
}

const getDificultadLabel = (dificultad: string): string => {
  const key = getDificultadKey(dificultad)

  if (key === 'facil') {
    return 'Facil'
  }

  if (key === 'media') {
    return 'Media'
  }

  return 'Alta'
}

const getModuloTheme = (modulo: string): ModuloTheme => {
  const normalized = modulo.trim().toLowerCase()

  if (normalized.includes('lectura')) {
    return {
      icon: BookOpen,
      gradient: 'from-usco-vino to-[#741017]',
      cardBorder: 'border-usco-ocre/80',
      bgSoft: 'bg-usco-vino/10',
      text: 'text-usco-vino',
      button: 'bg-usco-vino hover:bg-[#741017]',
    }
  }

  if (normalized.includes('cuantitativo') || normalized.includes('matematica')) {
    return {
      icon: Calculator,
      gradient: 'from-usco-gris to-[#3e4f58]',
      cardBorder: 'border-usco-ocre/80',
      bgSoft: 'bg-usco-gris/10',
      text: 'text-usco-gris',
      button: 'bg-usco-gris hover:bg-[#3e4f58]',
    }
  }

  if (normalized.includes('ciudadana')) {
    return {
      icon: Users2,
      gradient: 'from-usco-ocre to-[#c8ba80]',
      cardBorder: 'border-usco-ocre/80',
      bgSoft: 'bg-usco-ocre/35',
      text: 'text-usco-gris',
      button: 'bg-usco-vino hover:bg-[#741017]',
    }
  }

  if (normalized.includes('comunicacion') || normalized.includes('escrita')) {
    return {
      icon: MessageSquare,
      gradient: 'from-usco-vino to-usco-gris',
      cardBorder: 'border-usco-ocre/80',
      bgSoft: 'bg-usco-vino/10',
      text: 'text-usco-vino',
      button: 'bg-usco-vino hover:bg-[#741017]',
    }
  }

  if (normalized.includes('ingles')) {
    return {
      icon: Globe,
      gradient: 'from-usco-gris to-usco-vino',
      cardBorder: 'border-usco-ocre/80',
      bgSoft: 'bg-usco-gris/10',
      text: 'text-usco-gris',
      button: 'bg-usco-gris hover:bg-[#3e4f58]',
    }
  }

  return {
    icon: FileQuestion,
    gradient: 'from-usco-vino to-[#741017]',
    cardBorder: 'border-usco-ocre/80',
    bgSoft: 'bg-usco-fondo',
    text: 'text-usco-vino',
    button: 'bg-usco-vino hover:bg-[#741017]',
  }
}

const sortModuleEntries = (
  entries: Array<[string, ModuloGroup]>,
  sortBy: 'nombre' | 'total_desc' | 'total_asc',
): Array<[string, ModuloGroup]> => {
  const sorted = [...entries]

  if (sortBy === 'total_desc') {
    sorted.sort((a, b) => b[1].stats.total - a[1].stats.total)
    return sorted
  }

  if (sortBy === 'total_asc') {
    sorted.sort((a, b) => a[1].stats.total - b[1].stats.total)
    return sorted
  }

  sorted.sort(([a], [b]) => a.localeCompare(b))
  return sorted
}

const BancoPreguntasPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModulo, setSelectedModulo] = useState('')
  const [sortBy, setSortBy] = useState<'nombre' | 'total_desc' | 'total_asc'>('nombre')
  const [verPreguntasCriticas, setVerPreguntasCriticas] = useState(false)
  const [criticasProgramaId, setCriticasProgramaId] = useState<number | ''>('')
  const [criticasNivel, setCriticasNivel] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [undoMessage, setUndoMessage] = useState('')
  const [preguntaCriticaViendo, setPreguntaCriticaViendo] = useState<Pregunta | null>(null)
  const [ultimoLote, setUltimoLote] = useState<string | null>(null)
  const [lotePendienteRevertir, setLotePendienteRevertir] = useState<string | null>(null)
  const [resumenUltimoLote, setResumenUltimoLote] = useState<{
    preguntasCreadas: number
    filasConIA: number
  } | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery<Pregunta[], AxiosError<ApiErrorResponse>>({
    queryKey: ['preguntas'],
    queryFn: () => preguntasService.getPreguntas(),
  })
  const { data: modulos = [] } = useQuery<Modulo[], AxiosError<ApiErrorResponse>>({
    queryKey: ['modulos'],
    queryFn: preguntasService.getModulos,
  })
  const { data: programas = [] } = useQuery<Programa[]>({
    queryKey: ['programas'],
    queryFn: usuariosService.getProgramas,
  })
  const { data: criticasData, isFetching: isCriticasLoading } = useQuery({
    queryKey: ['preguntasCriticas', criticasProgramaId, criticasNivel, searchTerm],
    queryFn: () =>
      preguntasService.getPreguntasCriticas({
        umbral: 60,
        programaId: criticasProgramaId,
        nivel: criticasNivel,
        search: searchTerm.trim(),
      }),
    enabled: verPreguntasCriticas,
  })

  const preguntas = data ?? []
  const preguntasCriticas: PreguntaCriticaRow[] = criticasData?.results ?? []

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

  const revertirCargaMutation = useMutation({
    mutationFn: preguntasService.revertirCargaMasiva,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['preguntas'] })
      setUltimoLote(null)
      setResumenUltimoLote(null)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ULTIMO_LOTE_STORAGE_KEY)
      }
      setUndoMessage(
        response?.mensaje ??
          `Se eliminó la carga masiva (${response?.cantidad_eliminada ?? 0} pregunta(s)).`,
      )
    },
    onError: () => {
      setUndoMessage('No fue posible deshacer la carga masiva en este momento.')
    },
  })

  const moduloOptions = useMemo(() => {
    const names = Array.from(new Set(preguntas.map((pregunta) => getModuloNombre(pregunta))))
    return names.sort((a, b) => a.localeCompare(b))
  }, [preguntas])

  const preguntasFiltradas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return preguntas.filter((pregunta) => {
      const moduloName = getModuloNombre(pregunta)
      const matchModulo = selectedModulo ? moduloName === selectedModulo : true
      const matchSearch =
        term.length === 0 ||
        String(pregunta.enunciado ?? '')
          .toLowerCase()
          .includes(term)

      return matchModulo && matchSearch
    })
  }, [preguntas, searchTerm, selectedModulo])

  const preguntasAgrupadas = useMemo<Record<string, ModuloGroup>>(() => {
    return preguntasFiltradas.reduce<Record<string, ModuloGroup>>((acc, pregunta) => {
      const nombreModulo = getModuloNombre(pregunta) || 'General'

      if (!acc[nombreModulo]) {
        acc[nombreModulo] = {
          preguntas: [],
          stats: { total: 0, facil: 0, media: 0, alta: 0 },
        }
      }

      acc[nombreModulo].preguntas.push(pregunta)
      acc[nombreModulo].stats.total += 1
      acc[nombreModulo].stats[getDificultadKey(pregunta.dificultad)] += 1

      return acc
    }, {})
  }, [preguntasFiltradas])

  const modulosEntries = useMemo(
    () => sortModuleEntries(Object.entries(preguntasAgrupadas), sortBy),
    [preguntasAgrupadas, sortBy],
  )

  const resumenGlobal = useMemo(() => {
    const base = { total: 0, facil: 0, media: 0, alta: 0 }

    return preguntas.reduce((acc, pregunta) => {
      acc.total += 1
      acc[getDificultadKey(pregunta.dificultad)] += 1
      return acc
    }, base)
  }, [preguntas])

  const preguntasRecientes = useMemo(() => {
    return [...preguntasFiltradas].slice(-5).reverse()
  }, [preguntasFiltradas])

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

    const timeoutId = window.setTimeout(() => setSuccessMessage(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

  useEffect(() => {
    if (!undoMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => setUndoMessage(''), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [undoMessage])

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
      setUndoMessage('')
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

  if (isLoading) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
        Cargando banco de preguntas...
      </section>
    )
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error.response?.data?.detail ??
          error.response?.data?.detalle ??
          'No fue posible cargar las preguntas.'}
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-usco-vino">Banco de Preguntas</h1>
          <p className="mt-1 text-sm text-usco-gris">Gestion modular de preguntas para el ecosistema Saber Pro.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-usco-gris px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3e4f58]"
          >
            <Upload className="h-4 w-4" />
            Carga Masiva (Excel)
          </button>

          <button
            type="button"
            onClick={() => navigate('/preguntas/nueva')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-usco-vino px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#741017]"
          >
            <Plus className="h-4 w-4" />
            Nueva Pregunta
          </button>
        </div>
      </header>

      {successMessage && (
        <section className="rounded-xl border border-usco-ocre/90 bg-usco-fondo p-4 text-sm text-usco-vino shadow-sm">
          {successMessage}
        </section>
      )}

      {ultimoLote && (
        <section className="flex flex-col gap-3 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4 text-sm text-yellow-800 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            Carga masiva completada
            {resumenUltimoLote
              ? ` (${resumenUltimoLote.preguntasCreadas} preguntas, ${resumenUltimoLote.filasConIA} filas con IA).`
              : '.'}{' '}
            Subiste el archivo equivocado?
          </p>
          <button
            type="button"
            onClick={() => handleRevertirCarga(ultimoLote)}
            disabled={revertirCargaMutation.isPending}
            className="font-bold text-red-700 underline transition hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {revertirCargaMutation.isPending ? 'Revirtiendo...' : 'Deshacer ultima carga'}
          </button>
        </section>
      )}

      {undoMessage && (
        <section className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-800 shadow-sm">
          {undoMessage}
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-usco-ocre/70 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-usco-gris/80">Total Preguntas</p>
          <p className="mt-2 text-3xl font-bold text-usco-vino">{resumenGlobal.total}</p>
        </article>
        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-usco-gris/80">Faciles</p>
          <p className="mt-2 text-3xl font-bold text-usco-gris">{resumenGlobal.facil}</p>
        </article>
        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-usco-gris/80">Medias</p>
          <p className="mt-2 text-3xl font-bold text-usco-gris">{resumenGlobal.media}</p>
        </article>
        <article className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-usco-gris/80">Altas</p>
          <p className="mt-2 text-3xl font-bold text-usco-gris">{resumenGlobal.alta}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-usco-gris/70" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por enunciado..."
              className="h-11 w-full rounded-xl border border-usco-ocre/80 pl-9 pr-4 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
            />
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-usco-ocre/80 bg-white px-3 text-sm text-usco-gris">
            <Filter className="h-4 w-4" />
            <select
              value={selectedModulo}
              onChange={(event) => setSelectedModulo(event.target.value)}
              className="h-11 bg-transparent outline-none"
            >
              <option value="">Todos los modulos</option>
              {moduloOptions.map((modulo) => (
                <option key={modulo} value={modulo}>
                  {modulo}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-usco-ocre/80 bg-white px-3 text-sm text-usco-gris">
            <SortAsc className="h-4 w-4" />
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as 'nombre' | 'total_desc' | 'total_asc')
              }
              className="h-11 bg-transparent outline-none"
            >
              <option value="nombre">Orden: Modulo A-Z</option>
              <option value="total_desc">Orden: Mas preguntas</option>
              <option value="total_asc">Orden: Menos preguntas</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-usco-ocre/80 bg-usco-fondo px-3 py-2 text-sm font-semibold text-usco-gris">
            <input
              type="checkbox"
              checked={verPreguntasCriticas}
              onChange={(event) => setVerPreguntasCriticas(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-usco-vino focus:ring-usco-vino"
            />
            <AlertTriangle className="h-4 w-4 text-usco-vino" />
            Ver Preguntas Criticas (tasa de error &gt;= 60%)
          </label>

          {verPreguntasCriticas && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={criticasProgramaId}
                onChange={(event) =>
                  setCriticasProgramaId(event.target.value ? Number(event.target.value) : '')
                }
                className="rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none focus:border-usco-vino"
              >
                <option value="">Todos los programas</option>
                {programas.map((programa) => (
                  <option key={programa.id} value={programa.id}>
                    {programa.nombre}
                  </option>
                ))}
              </select>

              <select
                value={criticasNivel}
                onChange={(event) => setCriticasNivel(event.target.value)}
                className="rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none focus:border-usco-vino"
              >
                <option value="">Todos los niveles</option>
                <option value="Facil">Facil</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {verPreguntasCriticas && (
        <section className="overflow-hidden rounded-2xl border border-usco-ocre/80 bg-white shadow-sm">
          <header className="border-b border-usco-ocre/60 px-4 py-3">
            <h3 className="text-base font-semibold text-usco-vino">Preguntas Criticas</h3>
            <p className="text-sm text-usco-gris">
              Audita preguntas con alta tasa de error para mejorar su redaccion.
            </p>
          </header>

          {isCriticasLoading ? (
            <div className="p-4 text-sm text-usco-gris">Cargando preguntas criticas...</div>
          ) : preguntasCriticas.length === 0 ? (
            <div className="p-4 text-sm text-usco-gris">
              No hay preguntas criticas para los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-usco-fondo">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                      Enunciado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                      Modulo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                      Nivel
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                      Respondidas
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                      Incorrectas
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                      Tasa Error
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                      Accion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preguntasCriticas.map((pregunta, index) => (
                    <tr
                      key={String(pregunta.id)}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-usco-fondo/40'}
                    >
                      <td className="px-4 py-3 text-sm text-usco-gris">
                        <div className="line-clamp-2 max-w-md" title={String(pregunta.enunciado ?? '')}>
                          <RichTextRenderer
                            content={String(pregunta.enunciado ?? '')}
                            className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:m-0"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-usco-gris">{getModuloNombre(pregunta)}</td>
                      <td className="px-4 py-3 text-center text-sm text-usco-gris">
                        {getDificultadLabel(String(pregunta.dificultad))}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-usco-gris">
                        {pregunta.total_respondidas}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-usco-gris">
                        {pregunta.respuestas_incorrectas}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-usco-vino">
                        {pregunta.tasa_error}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setPreguntaCriticaViendo(pregunta)}
                          className="inline-flex items-center gap-1 rounded-lg border border-usco-vino px-3 py-1.5 text-xs font-semibold text-usco-vino transition hover:bg-usco-vino/10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver Pregunta
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {modulosEntries.length === 0 ? (
        <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-sm text-usco-gris shadow-sm">
          {preguntas.length === 0
            ? 'No hay preguntas registradas en este momento.'
            : 'No hay preguntas que coincidan con el criterio de busqueda.'}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {modulosEntries.map(([modulo, data]) => {
            const theme = getModuloTheme(modulo)
            const Icon = theme.icon

            const total = data.stats.total || 1
            const easyPct = (data.stats.facil / total) * 100
            const mediumPct = (data.stats.media / total) * 100
            const hardPct = (data.stats.alta / total) * 100

            return (
              <article
                key={modulo}
                className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${theme.cardBorder}`}
              >
                <div className={`h-1.5 bg-gradient-to-r ${theme.gradient}`} />

                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className={`rounded-xl p-3 ${theme.bgSoft}`}>
                      <Icon className={`h-6 w-6 ${theme.text}`} />
                    </div>
                    <span className="rounded-lg border border-usco-ocre/80 bg-usco-fondo px-2 py-1 text-xs font-medium text-usco-gris">
                      {data.stats.total} preguntas
                    </span>
                  </div>

                  <h2 className={`text-lg font-semibold ${theme.text}`}>{modulo}</h2>
                  <p className="mt-1 text-sm text-usco-gris">
                    Distribucion por dificultad para este modulo.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-md border border-usco-ocre/80 bg-usco-fondo px-2.5 py-1 text-xs font-semibold text-usco-gris">
                      Facil: {data.stats.facil}
                    </span>
                    <span className="rounded-md border border-usco-ocre/80 bg-usco-ocre/20 px-2.5 py-1 text-xs font-semibold text-usco-gris">
                      Media: {data.stats.media}
                    </span>
                    <span className="rounded-md border border-usco-vino/25 bg-usco-vino/10 px-2.5 py-1 text-xs font-semibold text-usco-vino">
                      Alta: {data.stats.alta}
                    </span>
                  </div>

                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-usco-fondo">
                    <div className="flex h-full w-full">
                      <span className="h-full bg-usco-gris" style={{ width: `${easyPct}%` }} />
                      <span className="h-full bg-usco-ocre" style={{ width: `${mediumPct}%` }} />
                      <span className="h-full bg-usco-vino" style={{ width: `${hardPct}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-usco-gris/75">Modulo activo en banco</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/preguntas/modulo/${encodeURIComponent(modulo)}`)}
                      className={`rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition ${theme.button}`}
                    >
                      Ver Preguntas
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {preguntasRecientes.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-usco-ocre/80 bg-white shadow-sm">
          <header className="border-b border-usco-ocre/60 px-4 py-3">
            <h3 className="text-base font-semibold text-usco-vino">Preguntas Recientes</h3>
            <p className="text-sm text-usco-gris">Ultimas preguntas segun el filtro aplicado.</p>
          </header>

          <div className="divide-y divide-usco-ocre/50">
            {preguntasRecientes.map((pregunta) => {
              const modulo = getModuloNombre(pregunta)
              const dificultad = getDificultadLabel(pregunta.dificultad)

              return (
                <article key={String(pregunta.id)} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-sm font-medium text-usco-gris" title={pregunta.enunciado}>
                      <RichTextRenderer
                        content={pregunta.enunciado}
                        className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:m-0"
                      />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-usco-gris/80">{modulo}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          dificultad === 'Facil'
                            ? 'bg-usco-fondo text-usco-gris'
                            : dificultad === 'Media'
                              ? 'bg-usco-ocre/25 text-usco-gris'
                              : 'bg-usco-vino/10 text-usco-vino'
                        }`}
                      >
                        {dificultad}
                      </span>
                      {pregunta.estado && (
                        <span className="rounded-md bg-usco-fondo px-2 py-0.5 text-xs font-semibold text-usco-gris">
                          {pregunta.estado}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/preguntas/modulo/${encodeURIComponent(modulo)}`)}
                    className="inline-flex items-center justify-center rounded-lg border border-usco-vino px-3 py-1.5 text-xs font-semibold text-usco-vino transition hover:bg-usco-vino/10"
                  >
                    Abrir modulo
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <CargaMasivaPreguntasModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        modulos={modulos}
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

      <VisualizarPreguntaModal
        isOpen={Boolean(preguntaCriticaViendo)}
        pregunta={preguntaCriticaViendo}
        onClose={() => setPreguntaCriticaViendo(null)}
      />
    </section>
  )
}

export default BancoPreguntasPage


