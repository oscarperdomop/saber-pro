import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { getCategorias, getCompetencias } from '../services/especificacionesService'
import preguntasService, {
  type CargaMasivaPreguntasResponse,
} from '../services/preguntasService'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import type { Categoria, Competencia } from '../../../types/evaluaciones'
import type { Modulo } from '../../../types/preguntas'

interface CargaMasivaPreguntasModalProps {
  isOpen: boolean
  onClose: () => void
  modulos: Modulo[]
  moduloPreseleccionado?: number | null
  onUploadSuccess?: (response: CargaMasivaPreguntasResponse) => void
}

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

interface ErrorFilaCarga {
  fila?: number
  error?: string
}

const CargaMasivaPreguntasModal = ({
  isOpen,
  onClose,
  modulos,
  moduloPreseleccionado = null,
  onUploadSuccess,
}: CargaMasivaPreguntasModalProps) => {
  const queryClient = useQueryClient()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [moduloId, setModuloId] = useState<number | ''>(moduloPreseleccionado ?? '')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [competenciaId, setCompetenciaId] = useState<number | ''>('')
  const [usarIA, setUsarIA] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [successVariant, setSuccessVariant] = useState<'success' | 'warning'>('success')
  const [erroresCarga, setErroresCarga] = useState<ErrorFilaCarga[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setModuloId(moduloPreseleccionado ?? '')
    setCategoriaId('')
    setCompetenciaId('')
    setUsarIA(true)
    setSelectedFile(null)
    setErrorMessage('')
    setSuccessMessage('')
    setSuccessVariant('success')
    setErroresCarga([])
    setIsLoading(false)
  }, [isOpen, moduloPreseleccionado])

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ['categorias', moduloId],
    queryFn: () => getCategorias(Number(moduloId)),
    enabled: Boolean(moduloId),
  })

  const { data: competencias = [] } = useQuery<Competencia[]>({
    queryKey: ['competencias', moduloId],
    queryFn: () => getCompetencias(Number(moduloId)),
    enabled: Boolean(moduloId),
  })

  useEffect(() => {
    setCategoriaId('')
    setCompetenciaId('')
  }, [moduloId])

  const nombreModuloSeleccionado = useMemo(() => {
    if (moduloId === '') {
      return ''
    }
    return modulos.find((modulo) => Number(modulo.id) === Number(moduloId))?.nombre ?? ''
  }, [moduloId, modulos])

  const closeModal = () => {
    if (isLoading) {
      return
    }
    setSelectedFile(null)
    setErrorMessage('')
    setSuccessMessage('')
    setSuccessVariant('success')
    setErroresCarga([])
    onClose()
  }

  const downloadTemplate = async () => {
    setErrorMessage('')
    try {
      const moduloSeleccionadoId = moduloId === '' ? undefined : Number(moduloId)
      const { blob, filename } = await preguntasService.descargarPlantillaCargaMasivaPreguntas(
        moduloSeleccionadoId,
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || 'plantilla_preguntas_generica.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      setErrorMessage('No fue posible descargar la plantilla desde el servidor.')
    }
  }

  const bulkUploadMutation = useMutation<
    CargaMasivaPreguntasResponse,
    AxiosError<ApiErrorResponse>,
    { file: File; moduloId?: number; categoriaId?: number; competenciaId?: number; usarIA: boolean }
  >({
    onMutate: () => {
      setIsLoading(true)
    },
    mutationFn: preguntasService.cargaMasivaPreguntas,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['preguntas'] })
      const creadas = response.creadas ?? response.preguntas_creadas ?? 0
      const omitidasDuplicado = response.omitidas ?? 0
      const sinIAPorError = response.sin_ia_por_error ?? 0
      const errores = response.errores?.length ?? 0
      setErroresCarga(response.errores ?? [])
      const filasVacias = response.filas_omitidas ?? 0
      let mensajeBase = `Se crearon las ${creadas} preguntas con éxito.`
      if (sinIAPorError > 0) {
        mensajeBase = (
          `Se crearon ${creadas} preguntas `
          + `(${sinIAPorError} quedaron sin distractores por limite o error de IA). `
          + `Omitidas duplicadas: ${omitidasDuplicado}.`
        )
      } else if (omitidasDuplicado > 0) {
        mensajeBase = `Se crearon ${creadas} preguntas. Se omitieron ${omitidasDuplicado} duplicadas.`
      }
      const extraErrores = errores > 0 ? ` Se registraron ${errores} fila(s) con error.` : ''
      const extraFilasVacias =
        filasVacias > 0 ? ` Se ignoraron ${filasVacias} fila(s) vacía(s).` : ''
      const extraLote = response.lote_id ? ` Lote: ${response.lote_id}.` : ''
      setSuccessVariant(
        sinIAPorError > 0 || omitidasDuplicado > 0 || errores > 0 ? 'warning' : 'success',
      )
      setSuccessMessage(
        `${mensajeBase}${extraErrores}${extraFilasVacias} Filas autocompletadas por IA: ${response.filas_con_ia}.${extraLote}`,
      )
      onUploadSuccess?.(response)
      setSelectedFile(null)
    },
    onError: (error) => {
      const backendMessage = error.response?.data?.detalle ?? error.response?.data?.detail
      setErroresCarga([])
      setErrorMessage(
        backendMessage ?? 'No fue posible procesar la carga masiva de preguntas.',
      )
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

  const submitDisabled = useMemo(
    () => !selectedFile || isLoading || bulkUploadMutation.isPending,
    [selectedFile, isLoading, bulkUploadMutation.isPending],
  )

  const handleSubmit = () => {
    if (isLoading) {
      return
    }

    if (!selectedFile) {
      setErrorMessage('Debes seleccionar un archivo CSV o Excel.')
      return
    }
    setErrorMessage('')
    bulkUploadMutation.mutate({
      file: selectedFile,
      moduloId: moduloId === '' ? undefined : Number(moduloId),
      categoriaId: categoriaId === '' ? undefined : Number(categoriaId),
      competenciaId: competenciaId === '' ? undefined : Number(competenciaId),
      usarIA,
    })
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="bank-scope fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!isLoading) {
          closeModal()
        }
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-usco-ocre/80 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-usco-fondo text-usco-vino">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-usco-vino">Carga Masiva de Preguntas</h2>
              <p className="mt-1 text-sm text-usco-gris">
                Si una fila trae solo ENUNCIADO y OPCION_CORRECTA, el sistema completará
                distractores faltantes con IA.
              </p>
              <p className="mt-1 text-xs text-usco-gris/80">
                Módulo, categoría y competencia se leen por fila desde el Excel. Estos selectores
                son solo para sobrescribir todo el lote.
              </p>
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
            <LoadingSpinner mensaje="Procesando archivo y generando distractores con Inteligencia Artificial. Esto puede tardar un momento..." />
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-usco-vino transition hover:text-[#741017]"
                >
                  <Download className="h-4 w-4" />
                  {nombreModuloSeleccionado
                    ? `Descargar plantilla de ${nombreModuloSeleccionado}`
                    : 'Descargar plantilla generica'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-usco-gris">Módulo</span>
                  <select
                    value={moduloId}
                    onChange={(event) =>
                      setModuloId(event.target.value ? Number(event.target.value) : '')
                    }
                    className="h-10 w-full rounded-xl border border-usco-ocre/80 px-3 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                  >
                    <option value="">Leer desde el archivo Excel (Recomendado)</option>
                    {modulos.map((modulo) => (
                      <option key={modulo.id} value={modulo.id}>
                        {modulo.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-usco-gris">
                    Categoría (sobrescribir lote, opcional)
                  </span>
                  <select
                    value={categoriaId}
                    onChange={(event) =>
                      setCategoriaId(event.target.value ? Number(event.target.value) : '')
                    }
                    disabled={!moduloId}
                    className="h-10 w-full rounded-xl border border-usco-ocre/80 px-3 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="">Leer desde el archivo Excel (Recomendado)</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-usco-gris">
                    Competencia (sobrescribir lote, opcional)
                  </span>
                  <select
                    value={competenciaId}
                    onChange={(event) =>
                      setCompetenciaId(event.target.value ? Number(event.target.value) : '')
                    }
                    disabled={!moduloId}
                    className="h-10 w-full rounded-xl border border-usco-ocre/80 px-3 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="">Leer desde el archivo Excel (Recomendado)</option>
                    {competencias.map((competencia) => (
                      <option key={competencia.id} value={competencia.id}>
                        {competencia.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-semibold text-usco-gris">Archivo *</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  className="w-full cursor-pointer rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-usco-fondo file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-usco-vino file:transition file:duration-200 file:ease-out file:hover:bg-usco-ocre/20 file:hover:text-[#741017] file:hover:shadow-sm"
                />
              </label>

              <div className="mb-2 mt-4 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="usar-ia-carga"
                  checked={usarIA}
                  onChange={(event) => setUsarIA(event.target.checked)}
                  className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                />
                <label htmlFor="usar-ia-carga" className="text-sm text-gray-700">
                  Generar distractores automáticamente con IA (el proceso tardará más tiempo por límites de cuota)
                </label>
              </div>

              {selectedFile && (
                <p className="mt-3 rounded-lg border border-usco-ocre/80 bg-usco-fondo px-3 py-2 text-xs text-usco-gris">
                  Archivo seleccionado: <span className="font-semibold">{selectedFile.name}</span>
                </p>
              )}

              {errorMessage && (
                <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div
                  className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                    successVariant === 'warning'
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-green-300 bg-green-50 text-green-700'
                  }`}
                >
                  {successMessage}
                </div>
              )}

              {erroresCarga.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <p className="font-semibold">
                    Detalle de filas con error ({erroresCarga.length}):
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {erroresCarga.slice(0, 10).map((item, index) => (
                      <li key={`${item.fila ?? 'fila'}-${index}`}>
                        Fila {item.fila ?? 'N/A'}: {item.error ?? 'Error no especificado.'}
                      </li>
                    ))}
                  </ul>
                  {erroresCarga.length > 10 && (
                    <p className="mt-1 font-medium">
                      ...y {erroresCarga.length - 10} error(es) más.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading || bulkUploadMutation.isPending}
                  className="rounded-xl border border-usco-gris/30 px-4 py-2.5 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitDisabled}
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
    </div>,
    document.body,
  )
}

export default CargaMasivaPreguntasModal




