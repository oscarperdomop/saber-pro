import RichTextRenderer from './RichTextRenderer'

interface KaTeXPreviewProps {
  text: string
  label?: string
  className?: string
}

const KaTeXPreview = ({ text, label = 'Vista previa', className = '' }: KaTeXPreviewProps) => {
  const hasContent = text.trim().length > 0

  return (
    <div className={`rounded-xl border border-usco-ocre/70 bg-usco-fondo p-3 ${className}`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-usco-gris">{label}</p>
      {hasContent ? (
        <RichTextRenderer
          content={text}
          className="text-sm text-usco-gris [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        />
      ) : (
        <p className="text-xs text-usco-gris/70">
          Escribe contenido para validar el render matematico.
        </p>
      )}
    </div>
  )
}

export default KaTeXPreview
