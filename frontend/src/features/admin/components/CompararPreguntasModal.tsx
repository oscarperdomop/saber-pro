import { createPortal } from 'react-dom'
import { CheckCircle2, X } from 'lucide-react'
import RichTextRenderer from '../../../components/ui/RichTextRenderer'
import type { Opcion, Pregunta } from '../../../types/preguntas'

interface CompararPreguntasModalProps {
  isOpen: boolean
  onClose: () => void
  preguntaA: Pregunta | null
  preguntaB: Pregunta | null
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/').replace(/\/+$/, '')
const backendOrigin = (() => {
  try {
    return new URL(apiBaseUrl).origin
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : ''
  }
})()

const resolveMediaUrl = (value?: string | null) => {
  if (!value) {
    return null
  }

  const raw = String(value).trim()
  if (!raw) {
    return null
  }

  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw
  }

  if (raw.startsWith('/')) {
    return `${backendOrigin}${raw}`
  }

  return `${backendOrigin}/${raw.replace(/^\/+/, '')}`
}

const getEstadoBadgeClass = (estado?: string) => {
  if (estado === 'Publicada') {
    return 'bg-green-100 text-green-800 border-green-200'
  }
  if (estado === 'Archivada') {
    return 'bg-red-100 text-red-700 border-red-200'
  }
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

const getDificultadBadgeClass = (dificultad?: string) => {
  const normalized = (dificultad ?? '').trim()

  if (normalized === 'Facil' || normalized === 'FÃ¡cil') {
    return 'bg-green-100 text-green-800 border-green-200'
  }
  if (normalized === 'Media' || normalized === 'Medio') {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }
  return 'bg-red-100 text-red-700 border-red-200'
}

const getPreguntaImage = (pregunta: Pregunta) => {
  return resolveMediaUrl(
    ((pregunta as unknown as { imagen?: string | null }).imagen ??
      (pregunta as unknown as { contexto_imagen?: string | null }).contexto_imagen) ??
      null,
  )
}

const renderOpcion = (preguntaId: string | number, opcion: Opcion, index: number) => {
  const optionImage = resolveMediaUrl(typeof opcion.imagen === 'string' ? opcion.imagen : null)

  return (
    <li
      key={`${preguntaId}-op-${opcion.id}-${index}`}
      className={`rounded-xl border px-3 py-3 ${
        opcion.es_correcta
          ? 'border-green-300 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-2">
        {opcion.es_correcta && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
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
}

const PreguntaPane = ({ pregunta, title }: { pregunta: Pregunta; title: string }) => {
  const preguntaImage = getPreguntaImage(pregunta)

  return (
    <article className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-usco-vino">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getEstadoBadgeClass(
              pregunta.estado,
            )}`}
          >
            {pregunta.estado ?? 'Borrador'}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getDificultadBadgeClass(
              pregunta.dificultad,
            )}`}
          >
            {pregunta.dificultad ?? 'N/A'}
          </span>
        </div>
      </header>

      <section className="rounded-xl border border-usco-ocre/70 bg-usco-fondo/40 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-usco-gris">Enunciado</h4>
        <RichTextRenderer
          content={pregunta.enunciado}
          className="mt-2 text-sm text-usco-gris [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        />
      </section>

      {preguntaImage && (
        <section className="mt-4 rounded-xl border border-usco-ocre/70 bg-white p-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-usco-gris">Imagen de la Pregunta</h4>
          <div className="mt-3 flex justify-center">
            <img
              src={preguntaImage}
              alt="Imagen de la pregunta"
              className="max-h-64 w-auto rounded-lg object-contain"
            />
          </div>
        </section>
      )}

      {pregunta.contexto_texto && (
        <section className="mt-4 rounded-xl border border-usco-ocre/70 bg-white p-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-usco-gris">Contexto</h4>
          <RichTextRenderer
            content={pregunta.contexto_texto}
            className="mt-2 text-sm text-usco-gris [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          />
        </section>
      )}

      <section className="mt-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-usco-gris">Opciones</h4>
        {pregunta.opciones?.length ? (
          <ul className="mt-3 space-y-2">
            {pregunta.opciones.map((opcion, index) => renderOpcion(pregunta.id, opcion, index))}
          </ul>
        ) : (
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-usco-gris">
            Esta pregunta no tiene opciones registradas.
          </div>
        )}
      </section>
    </article>
  )
}

const CompararPreguntasModal = ({
  isOpen,
  onClose,
  preguntaA,
  preguntaB,
}: CompararPreguntasModalProps) => {
  if (!isOpen || !preguntaA || !preguntaB) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-usco-ocre/80 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-usco-ocre/70 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-usco-vino">Comparacion de Versiones</h2>
            <p className="mt-1 text-sm text-usco-gris">
              Revisa diferencias entre dos preguntas seleccionadas.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-usco-gris transition hover:bg-usco-fondo hover:text-usco-vino"
            aria-label="Cerrar comparacion"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[80vh] overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <PreguntaPane pregunta={preguntaA} title="Version A" />
            <PreguntaPane pregunta={preguntaB} title="Version B" />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default CompararPreguntasModal
