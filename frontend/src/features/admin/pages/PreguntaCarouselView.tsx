import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Edit } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import RichTextRenderer from '../../../components/ui/RichTextRenderer'
import type { Opcion, Pregunta } from '../../../types/preguntas'

interface CarouselLocationState {
  preguntasList?: Pregunta[]
  startIndex?: number
  notification?: { type: 'success' | 'info'; message: string }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/').replace(/\/+$/, '')
const CAROUSEL_NOTIFICATION_STORAGE_KEY = 'preguntas_carousel_notification'

const backendOrigin = (() => {
  try {
    return new URL(apiBaseUrl).origin
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : ''
  }
})()

const resolveMediaUrl = (value?: string | null) => {
  if (!value) return null

  const raw = String(value).trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw
  }

  if (raw.startsWith('/')) {
    return `${backendOrigin}${raw}`
  }

  return `${backendOrigin}/${raw.replace(/^\/+/, '')}`
}

const getEstadoBadgeClass = (estado?: string) => {
  if (estado === 'Publicada') return 'border-green-200 bg-green-50 text-green-800'
  if (estado === 'Archivada') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-gray-200 bg-gray-50 text-gray-700'
}

const getDificultadBadgeClass = (dificultad?: string) => {
  const normalized = (dificultad ?? '').trim().toLowerCase()
  if (normalized === 'facil' || normalized === 'fácil') {
    return 'border-green-200 bg-green-50 text-green-800'
  }
  if (normalized === 'media' || normalized === 'medio') {
    return 'border-yellow-200 bg-yellow-50 text-yellow-800'
  }
  return 'border-red-200 bg-red-50 text-red-700'
}

const getModuloLabel = (pregunta: Pregunta) => {
  if (pregunta.modulo_nombre) return pregunta.modulo_nombre
  if (typeof pregunta.modulo === 'object' && pregunta.modulo !== null) {
    return pregunta.modulo.nombre
  }
  if (pregunta.modulo_id) return `Módulo ${pregunta.modulo_id}`
  if (typeof pregunta.modulo === 'number' || typeof pregunta.modulo === 'string') {
    return `Módulo ${String(pregunta.modulo)}`
  }
  return 'Sin módulo'
}

const getCategoriaLabel = (pregunta: Pregunta) => {
  const preguntaWithCategoriaNombre = pregunta as Pregunta & { categoria_nombre?: string | null }
  if (preguntaWithCategoriaNombre.categoria_nombre?.trim()) {
    return preguntaWithCategoriaNombre.categoria_nombre.trim()
  }
  if (pregunta.categoria_id) return `Categoría ${pregunta.categoria_id}`
  if (typeof pregunta.categoria === 'number') return `Categoría ${pregunta.categoria}`
  return 'Sin categoría'
}

const PreguntaCarouselView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state as CarouselLocationState | null) ?? null
  const { preguntasList = [], startIndex = 0 } = locationState ?? {}
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(
    locationState?.notification ?? null,
  )

  const safeStartIndex = useMemo(() => {
    if (!preguntasList.length) return 0
    return Math.min(Math.max(startIndex, 0), preguntasList.length - 1)
  }, [preguntasList.length, startIndex])

  const [currentIndex, setCurrentIndex] = useState(safeStartIndex)

  const preguntaActual = preguntasList[currentIndex] ?? null

  if (!preguntasList.length || !preguntaActual) {
    return (
      <section className="mx-auto w-full max-w-5xl space-y-4 rounded-2xl border border-usco-ocre/80 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-usco-vino">CARRUSEL DE PREGUNTAS</h1>
        <p className="text-sm text-usco-gris">
          No hay datos del carrusel en memoria. Vuelve al listado de preguntas.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-usco-gris/30 px-4 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
        >
          <ArrowLeft className="h-4 w-4" />
          REGRESAR
        </button>
      </section>
    )
  }

  const preguntaImagen = resolveMediaUrl(
    (typeof preguntaActual.imagen_grafica === 'string' ? preguntaActual.imagen_grafica : null) ??
      ((preguntaActual as unknown as { imagen?: string | null }).imagen ??
        (preguntaActual as unknown as { contexto_imagen?: string | null }).contexto_imagen) ??
      null,
  )

  const mostrarImagenPregunta =
    preguntaActual.soporte_multimedia === 'IMAGEN' || Boolean(preguntaImagen)
  const mostrarLatexPregunta =
    preguntaActual.soporte_multimedia === 'LATEX' ||
    Boolean((preguntaActual.codigo_latex ?? '').trim())

  const puedeRetroceder = currentIndex > 0
  const puedeAvanzar = currentIndex < preguntasList.length - 1

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.sessionStorage.getItem(CAROUSEL_NOTIFICATION_STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as { type?: 'success' | 'info'; message?: string }
      if (parsed?.message && (parsed.type === 'success' || parsed.type === 'info')) {
        setNotification({ type: parsed.type, message: parsed.message })
      }
    } catch {
      // noop
    } finally {
      window.sessionStorage.removeItem(CAROUSEL_NOTIFICATION_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (!notification) return
    const id = window.setTimeout(() => setNotification(null), 3000)
    return () => window.clearTimeout(id)
  }, [notification])

  return (
    <section className="bank-scope mx-auto w-full max-w-5xl space-y-5">
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

      <header className="flex flex-col gap-3 rounded-2xl border border-usco-ocre/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-usco-gris/30 px-3 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
          >
            <ArrowLeft className="h-4 w-4" />
            Regresar a la lista
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(`/preguntas/${preguntaActual.id}/editar`, {
                state: {
                  fromCarousel: true,
                },
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-usco-vino px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#741017]"
          >
            <Edit className="h-4 w-4" />
            Editar
          </button>
        </div>

        <h1 className="text-2xl font-bold text-usco-vino">Vista Carrusel de Preguntas</h1>
      </header>

      <section className="rounded-2xl border border-usco-ocre/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getEstadoBadgeClass(preguntaActual.estado)}`}>
            Estado: {preguntaActual.estado ?? 'Borrador'}
          </span>
          <span className="rounded-full border border-usco-ocre/80 bg-usco-fondo px-3 py-1 text-xs font-semibold text-usco-gris">
            Módulo: {getModuloLabel(preguntaActual)}
          </span>
          <span className="rounded-full border border-usco-ocre/80 bg-usco-fondo px-3 py-1 text-xs font-semibold text-usco-gris">
            Categoría: {getCategoriaLabel(preguntaActual)}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDificultadBadgeClass(preguntaActual.dificultad)}`}>
            Dificultad: {preguntaActual.dificultad ?? 'N/A'}
          </span>
        </div>

        <h2 className="text-sm font-bold uppercase tracking-wide text-usco-gris">Enunciado</h2>
        <RichTextRenderer
          content={preguntaActual.enunciado}
          className="mt-3 text-lg font-medium leading-relaxed text-usco-gris [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        />

        {preguntaActual.contexto_texto && (
          <div className="mt-4 rounded-xl border border-usco-ocre/70 bg-usco-fondo/40 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-usco-gris">Contexto</h3>
            <RichTextRenderer
              content={preguntaActual.contexto_texto}
              className="mt-2 text-sm text-usco-gris [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            />
          </div>
        )}

        {mostrarImagenPregunta && preguntaImagen && (
          <div className="mt-4 rounded-xl border border-usco-ocre/70 bg-white p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-usco-gris">
              Imagen adjunta
            </h3>
            <div className="mt-3 flex justify-center">
              <img
                src={preguntaImagen}
                alt="Imagen de la pregunta"
                className="max-h-72 w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        )}

        {mostrarLatexPregunta && (preguntaActual.codigo_latex ?? '').trim() && (
          <div className="mt-4 rounded-xl border border-usco-ocre/70 bg-white p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-usco-gris">Código LaTeX</h3>
            <RichTextRenderer
              content={(preguntaActual.codigo_latex ?? '').trim()}
              className="mt-2 text-sm text-usco-gris [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-usco-ocre/80 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-usco-gris">Opciones de respuesta</h2>
        {preguntaActual.opciones?.length ? (
          <ul className="mt-3 space-y-3">
            {preguntaActual.opciones.map((opcion: Opcion, index: number) => {
              const optionImage = resolveMediaUrl(typeof opcion.imagen === 'string' ? opcion.imagen : null)

              return (
                <li
                  key={`${preguntaActual.id}-op-${opcion.id}-${index}`}
                  className={`rounded-xl border px-4 py-3 ${
                    opcion.es_correcta
                      ? 'border-green-300 bg-green-50/80 ring-1 ring-green-200'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {opcion.es_correcta && (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    )}
                    <div className="flex-1">
                      <RichTextRenderer
                        content={opcion.texto?.trim() || 'Opcion con recurso visual'}
                        className={`text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${
                          opcion.es_correcta ? 'font-semibold text-green-800' : 'font-medium text-usco-gris'
                        }`}
                      />
                      {optionImage && (
                        <img
                          src={optionImage}
                          alt={`Imagen de opcion ${index + 1}`}
                          className="mt-2 max-h-48 rounded-md object-contain"
                        />
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-usco-gris">
            Esta pregunta no tiene opciones registradas.
          </div>
        )}
      </section>

      <footer className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-usco-fondo">
          <div
            className="h-full rounded-full bg-usco-vino transition-all"
            style={{ width: `${((currentIndex + 1) / preguntasList.length) * 100}%` }}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={!puedeRetroceder}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-usco-gris/30 px-4 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <p className="text-center text-sm font-semibold text-usco-gris">
            Pregunta {currentIndex + 1} de {preguntasList.length}
          </p>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(preguntasList.length - 1, prev + 1))}
            disabled={!puedeAvanzar}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-usco-vino px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#741017] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </section>
  )
}

export default PreguntaCarouselView
