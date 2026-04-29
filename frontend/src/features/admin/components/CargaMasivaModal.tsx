import { useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { subirExcelUsuarios } from '../services/usuariosService'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'

interface CargaMasivaModalProps {
  isOpen: boolean
  onClose: () => void
}

interface CargaMasivaResponse {
  total_procesados?: number
  creados?: number
  errores?: Array<{ fila?: number; error?: string }>
  mensaje?: string
}

interface ApiErrorResponse {
  detail?: string
  detalle?: string
  message?: string
}

const UTF8_BOM_BYTES = new Uint8Array([0xef, 0xbb, 0xbf])

const CargaMasivaModal = ({ isOpen, onClose }: CargaMasivaModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [resultadoCarga, setResultadoCarga] = useState<CargaMasivaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const descargarPlantilla = () => {
    const separador = 'sep=;\r\n'
    const cabeceras =
      'documento;tipo_documento;nombres;apellidos;correo_institucional;programa;genero;semestre\r\n'
    const ejemplo = '1001234567;CC;Juan;Perez;juan.perez@usco.edu.co;Ingenieria de Software;M;5\r\n'
    const csvText = `${separador}${cabeceras}${ejemplo}`
    const csvBytes = new TextEncoder().encode(csvText)
    const csvWithBom = new Uint8Array(UTF8_BOM_BYTES.length + csvBytes.length)
    csvWithBom.set(UTF8_BOM_BYTES, 0)
    csvWithBom.set(csvBytes, UTF8_BOM_BYTES.length)

    const blob = new Blob([csvWithBom], {
      type: 'text/csv;charset=utf-8;',
    })

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'plantilla_estudiantes_usco.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const resetModalState = () => {
    setSelectedFile(null)
    setErrorMessage('')
  }

  const closeModal = () => {
    if (isLoading) {
      return
    }
    resetModalState()
    onClose()
  }

  const closeSuccessDialog = () => {
    setSuccessMessage('')
    setResultadoCarga(null)
  }

  const uploadMutation = useMutation<CargaMasivaResponse, AxiosError<ApiErrorResponse>, File>({
    onMutate: () => {
      setIsLoading(true)
    },
    mutationFn: subirExcelUsuarios,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setResultadoCarga(response)

      const totalProcesados = response.total_procesados ?? 0
      const creados = response.creados ?? 0
      const errores = response.errores ?? []
      const totalErrores = errores.length

      let resumen = response.mensaje ?? `Archivo procesado. Creados: ${creados} de ${totalProcesados}.`

      if (totalErrores > 0 && creados === 0) {
        resumen = `No fue posible crear usuarios. Archivo procesado: ${totalProcesados}. Errores: ${totalErrores}.`
      } else if (totalErrores > 0) {
        resumen = `Carga parcial. Creados: ${creados} de ${totalProcesados}. Filas con error: ${totalErrores}.`
      }

      resetModalState()
      onClose()
      setSuccessMessage(resumen)
    },
    onError: (error) => {
      const backendMessage =
        error.response?.data?.detalle ?? error.response?.data?.detail ?? error.response?.data?.message
      setErrorMessage(backendMessage ?? 'No fue posible procesar el archivo. Verifica el formato del Excel.')
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

  const handleSubmit = () => {
    if (isLoading) {
      return
    }

    if (!selectedFile) {
      setErrorMessage('Debes seleccionar un archivo Excel antes de continuar.')
      return
    }
    setErrorMessage('')
    uploadMutation.mutate(selectedFile)
  }

  if (!isOpen && !successMessage) {
    return null
  }

  const totalErrores = resultadoCarga?.errores?.length ?? 0
  const totalProcesados = resultadoCarga?.total_procesados ?? 0
  const creados = resultadoCarga?.creados ?? 0
  const cargaFallida = totalErrores > 0 && totalProcesados > 0 && creados === 0
  const cargaConObservaciones = totalErrores > 0 && !cargaFallida
  const erroresDestacados = resultadoCarga?.errores?.slice(0, 5) ?? []

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => {
        if (!isLoading) {
          closeModal()
        }
      }}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-usco-ocre/80 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-usco-fondo text-usco-vino">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-usco-vino">Carga Masiva de Estudiantes</h2>
              {!isLoading ? (
                <>
                  <p className="mt-1 text-sm text-usco-gris">
                    Sube un archivo .xlsx o .csv con las columnas: documento, tipo_documento, nombres, apellidos,
                    correo_institucional, programa, género y semestre.
                  </p>
                  <div className="mb-4 mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                    <button
                      onClick={descargarPlantilla}
                      type="button"
                      className="flex items-center gap-1 text-sm font-semibold text-usco-vino transition-colors hover:text-red-900"
                    >
                      <Download size={16} />
                      Descargar plantilla de ejemplo
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            disabled={isLoading}
            className="rounded-md p-1 text-usco-gris transition hover:bg-usco-fondo hover:text-usco-vino"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-0">
          {isLoading ? (
            <LoadingSpinner mensaje="Procesando archivo de usuarios y validando registros. Esto puede tardar un momento..." />
          ) : (
            <>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-semibold text-usco-gris">Archivo de usuarios</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris file:mr-3 file:rounded-lg file:border-0 file:bg-usco-fondo file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-usco-vino"
                />
              </label>

              {selectedFile && (
                <p className="mb-4 rounded-lg border border-usco-ocre/80 bg-usco-fondo px-3 py-2 text-xs text-usco-gris">
                  Archivo seleccionado: <span className="font-semibold">{selectedFile.name}</span>
                </p>
              )}

              {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading || uploadMutation.isPending}
                  className="rounded-xl border border-usco-gris/30 px-4 py-2.5 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || uploadMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-usco-vino px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#741017] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Upload className="h-4 w-4" />
                  {isLoading ? 'Procesando...' : 'Subir Archivo'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null

  const successContent = successMessage ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-usco-ocre/80 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              cargaFallida
                ? 'bg-red-50 text-red-700'
                : cargaConObservaciones
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-green-50 text-green-700'
            }`}
          >
            {cargaFallida || cargaConObservaciones ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </span>
          <div>
            <h3 className="text-lg font-bold text-usco-vino">
              {cargaFallida ? 'Carga con errores' : cargaConObservaciones ? 'Carga parcial' : 'Carga completada'}
            </h3>
            <p className="mt-1 text-sm text-usco-gris">{successMessage}</p>
          </div>
        </div>

        {totalErrores > 0 && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Detalle de errores</p>
            <ul className="space-y-1 text-sm text-red-700">
              {erroresDestacados.map((item, index) => (
                <li key={`${item.fila ?? 'fila'}-${index}`} className="leading-snug">
                  {item.fila ? `Fila ${item.fila}: ` : ''}
                  {item.error ?? 'Error sin detalle.'}
                </li>
              ))}
            </ul>
            {totalErrores > erroresDestacados.length && (
              <p className="mt-2 text-xs text-red-700">
                +{totalErrores - erroresDestacados.length} error(es) adicional(es).
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={closeSuccessDialog}
            className="rounded-xl bg-usco-vino px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#741017]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  ) : null

  if (typeof document === 'undefined') {
    return null
  }

  return (
    <>
      {modalContent ? createPortal(modalContent, document.body) : null}
      {successContent ? createPortal(successContent, document.body) : null}
    </>
  )
}

export default CargaMasivaModal
