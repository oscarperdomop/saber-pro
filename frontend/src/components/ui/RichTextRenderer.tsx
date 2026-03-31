import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface RichTextRendererProps {
  content: string
  className?: string
}

const normalizeMathContent = (rawContent: string): string => {
  if (!rawContent) return ''

  let normalized = rawContent

  // Soporta sintaxis LaTeX \(...\) y \[...\] además de $...$ / $$...$$.
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

  return normalized
}

const RichTextRenderer = ({ content, className = '' }: RichTextRendererProps) => {
  const normalizedContent = normalizeMathContent(content ?? '')

  return (
    <div className={`prose max-w-none text-inherit ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
}

export default RichTextRenderer
