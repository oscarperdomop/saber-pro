import { Component, type ReactNode } from 'react'

interface PageErrorBoundaryProps {
  children: ReactNode
  title?: string
}

interface PageErrorBoundaryState {
  hasError: boolean
}

class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('PageErrorBoundary capturo un error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-semibold">
            {this.props.title ?? 'Ocurrió un error inesperado al renderizar esta vista.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-lg border border-red-400 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Recargar página
          </button>
        </section>
      )
    }

    return this.props.children
  }
}

export default PageErrorBoundary
