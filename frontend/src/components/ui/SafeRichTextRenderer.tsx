import { Component } from 'react'
import RichTextRenderer from './RichTextRenderer'

interface SafeRichTextRendererProps {
  content: unknown
  className?: string
  fallbackClassName?: string
}

interface SafeRichTextRendererState {
  hasError: boolean
}

class SafeRichTextRenderer extends Component<
  SafeRichTextRendererProps,
  SafeRichTextRendererState
> {
  constructor(props: SafeRichTextRendererProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): SafeRichTextRendererState {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: SafeRichTextRendererProps) {
    if (prevProps.content !== this.props.content && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    const content = String(this.props.content ?? '')
    if (this.state.hasError) {
      return (
        <p className={this.props.fallbackClassName ?? 'whitespace-pre-wrap break-words text-inherit'}>
          {content}
        </p>
      )
    }

    return <RichTextRenderer content={content} className={this.props.className ?? ''} />
  }
}

export default SafeRichTextRenderer
