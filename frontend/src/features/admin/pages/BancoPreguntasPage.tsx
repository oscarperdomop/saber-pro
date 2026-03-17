import { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import preguntasService from '../services/preguntasService'
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

const BancoPreguntasPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const { data, isLoading, isError, error } = useQuery<Pregunta[], AxiosError<ApiErrorResponse>>({
    queryKey: ['preguntas'],
    queryFn: () => preguntasService.getPreguntas(),
  })

  const preguntas = data ?? []

  const preguntasAgrupadas = useMemo<Record<string, ModuloGroup>>(() => {
    const term = searchTerm.trim().toLowerCase()

    const filtradas =
      term.length > 0
        ? preguntas.filter((pregunta) =>
            String(pregunta?.enunciado ?? '')
              .toLowerCase()
              .includes(term),
          )
        : preguntas

    return filtradas.reduce<Record<string, ModuloGroup>>((acc, pregunta) => {
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
  }, [preguntas, searchTerm])

  const modulosEntries = useMemo(
    () => Object.entries(preguntasAgrupadas).sort(([a], [b]) => a.localeCompare(b)),
    [preguntasAgrupadas],
  )

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
    <section className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-usco-vino">Banco de Preguntas</h1>
        <button
          type="button"
          onClick={() => navigate('/preguntas/nueva')}
          className="inline-flex items-center justify-center rounded-xl bg-usco-vino px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#741017]"
        >
          + Nueva Pregunta
        </button>
      </header>

      {successMessage && (
        <section className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800 shadow-sm">
          {successMessage}
        </section>
      )}

      <div className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por enunciado..."
          className="w-full rounded-xl border border-usco-ocre/80 px-4 py-2.5 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
        />
      </div>

      {modulosEntries.length === 0 && (
        <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-sm text-usco-gris shadow-sm">
          {preguntas.length === 0
            ? 'No hay preguntas registradas en este momento.'
            : 'No hay preguntas que coincidan con el criterio de busqueda.'}
        </section>
      )}

      {modulosEntries.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modulosEntries.map(([modulo, data]) => (
            <article
              key={modulo}
              className="flex flex-col justify-between rounded-lg border-t-4 border-usco-vino bg-white p-5 shadow-md"
            >
              <div>
                <h2 className="mb-2 text-xl font-bold text-usco-vino">{modulo}</h2>
                <p className="text-sm text-usco-gris">
                  Total de preguntas: <span className="font-bold">{data.stats.total}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                    Facil: {data.stats.facil}
                  </span>
                  <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                    Media: {data.stats.media}
                  </span>
                  <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                    Alta: {data.stats.alta}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/preguntas/modulo/${encodeURIComponent(modulo)}`)}
                className="mt-4 w-full rounded bg-usco-vino py-2 text-white transition-colors hover:bg-red-900"
              >
                Ver Preguntas
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default BancoPreguntasPage
