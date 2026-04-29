import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface RichTextRendererProps {
  content: string
  className?: string
}

const hasExplicitMathDelimiters = (value: string): boolean => {
  return /\$\$[\s\S]*\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/.test(value)
}

const isLikelyPureLatexExpression = (value: string): boolean => {
  const trimmed = value.trim()
  if (!trimmed) return false

  // Señales claras de sintaxis matemática LaTeX.
  if (!/[\\^_{}]/.test(trimmed)) return false

  const tokens = trimmed.split(/\s+/)
  return tokens.every((token) => {
    // Operadores y separadores frecuentes.
    if (/^[0-9+\-*/=<>()[\]{}.,:;|]+$/.test(token)) return true

    // Variables cortas (x, y, z, x^2, etc.).
    if (/^[A-Za-z]([A-Za-z0-9^_{}]*)?$/.test(token) && token.length <= 3) return true

    // Comandos LaTeX (\frac, \sqrt, \alpha...).
    if (/^\\[A-Za-z]+/.test(token)) return true

    return false
  })
}

const normalizeMathContent = (rawContent: string): string => {
  if (!rawContent) return ''

  let normalized = rawContent

  // Soporta sintaxis LaTeX \(...\), \[...\], además de $...$ / $$...$$.
  normalized = normalized.replace(/\\\\\(([\s\S]*?)\\\\\)/g, (_, expr: string) => {
    return `$${expr.trim()}$`
  })
  normalized = normalized.replace(/\\\\\[([\s\S]*?)\\\\\]/g, (_, expr: string) => {
    return `$$${expr.trim()}$$`
  })
  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (_, expr: string) => {
    return `$${expr.trim()}$`
  })
  normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, (_, expr: string) => {
    return `$$${expr.trim()}$$`
  })

  // Si viene una expresión pura como "\frac{1}{6}" sin delimitadores,
  // la envolvemos para que KaTeX la renderice correctamente.
  if (!hasExplicitMathDelimiters(normalized) && isLikelyPureLatexExpression(normalized)) {
    normalized = `$${normalized.trim()}$`
  }

  return normalized
}

const RichTextRenderer = ({ content, className = '' }: RichTextRendererProps) => {
  const normalizedContent = normalizeMathContent(content ?? '')

  return (
    <div className={`prose max-w-none text-inherit ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
}

export default RichTextRenderer
