import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { FileSpreadsheet, X } from 'lucide-react'
import type { ConfigReporteAvanzadoSimulacro } from '../../../types/evaluaciones'

interface ReportBuilderModalProps {
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onGenerate: (config: ConfigReporteAvanzadoSimulacro) => Promise<void> | void
}

const defaultConfig: ConfigReporteAvanzadoSimulacro = {
  incluir_general: true,
  incluir_programa: true,
  incluir_demografia: true,
  incluir_preguntas: true,
  incluir_competencias: true,
}

const ReportBuilderModal = ({ isOpen, isLoading, onClose, onGenerate }: ReportBuilderModalProps) => {
  const [config, setConfig] = useState<ConfigReporteAvanzadoSimulacro>(defaultConfig)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setConfig(defaultConfig)
      setErrorMessage('')
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleToggle =
    (key: keyof ConfigReporteAvanzadoSimulacro) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked
      setConfig((prev) => ({ ...prev, [key]: checked }))
      setErrorMessage('')
    }

  const handleGenerate = async () => {
    const isAnyChecked =
      config.incluir_general ||
      config.incluir_programa ||
      config.incluir_demografia ||
      config.incluir_preguntas ||
      config.incluir_competencias

    if (!isAnyChecked) {
      setErrorMessage('Debes seleccionar al menos una sección para generar el reporte.')
      return
    }

    try {
      await onGenerate(config)
    } catch {
      setErrorMessage('No fue posible generar el reporte. Intenta nuevamente.')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-usco-ocre/70 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-usco-ocre/50 px-6 py-5">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-usco-vino">Generar Reporte Avanzado</h3>
            <p className="text-sm text-usco-gris">
              Selecciona exactamente las métricas que deseas incluir en el archivo Excel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-usco-gris transition hover:bg-usco-fondo hover:text-usco-vino"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          <label className="flex items-start gap-3 rounded-xl border border-usco-ocre/40 p-3">
            <input
              type="checkbox"
              checked={config.incluir_general}
              onChange={handleToggle('incluir_general')}
              className="mt-0.5 h-4 w-4 rounded border-usco-ocre text-usco-vino focus:ring-usco-vino"
            />
            <span className="text-sm text-usco-gris">Resultados Generales por Estudiante</span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-usco-ocre/40 p-3">
            <input
              type="checkbox"
              checked={config.incluir_programa}
              onChange={handleToggle('incluir_programa')}
              className="mt-0.5 h-4 w-4 rounded border-usco-ocre text-usco-vino focus:ring-usco-vino"
            />
            <span className="text-sm text-usco-gris">Consolidado por Programa Académico</span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-usco-ocre/40 p-3">
            <input
              type="checkbox"
              checked={config.incluir_demografia}
              onChange={handleToggle('incluir_demografia')}
              className="mt-0.5 h-4 w-4 rounded border-usco-ocre text-usco-vino focus:ring-usco-vino"
            />
            <span className="text-sm text-usco-gris">Segmentación Demográfica (Género y Semestre)</span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-usco-ocre/40 p-3">
            <input
              type="checkbox"
              checked={config.incluir_preguntas}
              onChange={handleToggle('incluir_preguntas')}
              className="mt-0.5 h-4 w-4 rounded border-usco-ocre text-usco-vino focus:ring-usco-vino"
            />
            <span className="text-sm text-usco-gris">
              Análisis Estadístico por Pregunta (Ranking de dificultad)
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-usco-ocre/40 p-3">
            <input
              type="checkbox"
              checked={config.incluir_competencias}
              onChange={handleToggle('incluir_competencias')}
              className="mt-0.5 h-4 w-4 rounded border-usco-ocre text-usco-vino focus:ring-usco-vino"
            />
            <span className="text-sm text-usco-gris">Análisis por Competencias y Categorías</span>
          </label>

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-usco-ocre/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-usco-gris/30 px-4 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isLoading ? 'Generando...' : 'Generar Reporte Excel'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportBuilderModal
