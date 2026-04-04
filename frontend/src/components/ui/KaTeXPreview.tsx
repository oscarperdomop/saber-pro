import RichTextRenderer from './RichTextRenderer'

interface KaTeXPreviewProps {
  text: string
  label?: string
  className?: string
}

const KaTeXPreview = ({ text, label = 'Vista previa', className = '' }: KaTeXPreviewProps) => {
  const hasContent = text.trim().length > 0
  const hasAdvancedLatex =
    /\\begin\{(tikzpicture|pregunta|axis|figure|document)\}/i.test(text) ||
    /\\documentclass|\\usepackage|\\newtcolorbox/i.test(text)

  return (
    <div className={`rounded-xl border border-usco-ocre/70 bg-usco-fondo p-3 ${className}`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-usco-gris">{label}</p>
      {hasContent ? (
        hasAdvancedLatex ? (
          <div className="space-y-2">
            <p className="rounded border border-usco-ocre/80 bg-white p-2 text-xs text-usco-gris">
              Este fragmento usa entornos LaTeX avanzados (por ejemplo TikZ o pregunta). La vista
              previa web solo valida formulas KaTeX; el render final se genera en el backend al
              guardar la pregunta.
            </p>
            <pre className="max-h-44 overflow-auto rounded border border-gray-200 bg-white p-2 text-xs text-usco-gris">
              {text}
            </pre>
          </div>
        ) : (
          <RichTextRenderer
            content={text}
            className="text-sm text-usco-gris [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          />
        )
      ) : (
        <p className="text-xs text-usco-gris/70">
          Escribe contenido para validar el render matematico.
        </p>
      )}
    </div>
  )
}

export default KaTeXPreview
