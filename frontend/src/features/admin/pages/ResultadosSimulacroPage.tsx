import type { AxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Filter, RefreshCcw, Settings2, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import RichTextRenderer from '../../../components/ui/RichTextRenderer'
import simulacrosService from '../services/simulacrosService'
import { getProgramas } from '../services/usuariosService'
import ReportBuilderModal from '../components/ReportBuilderModal'
import type {
  AnaliticasDetalladasSimulacro,
  ConfigReporteAvanzadoSimulacro,
  FiltrosResultadosSimulacro,
  PlantillaExamen,
  Programa,
  ResultadoSimulacro,
} from '../../../types/evaluaciones'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

const PAGE_SIZE = 10

const formatFecha = (fecha: string | null): string => {
  if (!fecha) {
    return 'N/A'
  }

  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const formatPuntaje = (value?: number | null): string => {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number)) {
    return '0.00'
  }
  return number.toFixed(2)
}

const ResultadosSimulacroPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [filtroPrograma, setFiltroPrograma] = useState<string>('')
  const [filtroGenero, setFiltroGenero] = useState<string>('')
  const [filtroSemestre, setFiltroSemestre] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isGeneratingAdvancedReport, setIsGeneratingAdvancedReport] = useState(false)

  const filtrosActivos = useMemo<FiltrosResultadosSimulacro>(
    () => ({
      programa: filtroPrograma || undefined,
      genero: filtroGenero || undefined,
      semestre: filtroSemestre || undefined,
    }),
    [filtroGenero, filtroPrograma, filtroSemestre],
  )

  const {
    data: resultadosData,
    isLoading: cargandoResultados,
    isError: errorResultados,
    error: detalleErrorResultados,
  } = useQuery<ResultadoSimulacro[], AxiosError<ApiErrorResponse>>({
    queryKey: ['simulacroResultados', id, filtrosActivos],
    queryFn: () => simulacrosService.getResultadosSimulacro(String(id), filtrosActivos),
    enabled: Boolean(id),
  })

  const {
    data: analiticasData,
    isLoading: cargandoAnaliticas,
    isError: errorAnaliticas,
    error: detalleErrorAnaliticas,
  } = useQuery<AnaliticasDetalladasSimulacro, AxiosError<ApiErrorResponse>>({
    queryKey: ['simulacroAnaliticas', id, filtrosActivos],
    queryFn: () => simulacrosService.obtenerAnaliticasSimulacro(String(id), filtrosActivos),
    enabled: Boolean(id),
  })

  const { data: simulacroDetalle } = useQuery<PlantillaExamen, AxiosError<ApiErrorResponse>>({
    queryKey: ['simulacroDetalleResultados', id],
    queryFn: () => simulacrosService.getSimulacroById(String(id)),
    enabled: Boolean(id),
  })

  const { data: programasData } = useQuery<Programa[], AxiosError<ApiErrorResponse>>({
    queryKey: ['programas', 'resultados-simulacro'],
    queryFn: getProgramas,
  })

  const resultados = resultadosData ?? []
  const analiticas = analiticasData
  const programas = programasData ?? []
  const totalResultados = resultados.length
  const totalPages = Math.max(1, Math.ceil(totalResultados / PAGE_SIZE))
  const resultadosPaginados = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return resultados.slice(start, start + PAGE_SIZE)
  }, [currentPage, resultados])

  useEffect(() => {
    setCurrentPage(1)
  }, [filtroPrograma, filtroGenero, filtroSemestre, id])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleResetFiltros = () => {
    setFiltroPrograma('')
    setFiltroGenero('')
    setFiltroSemestre('')
    setCurrentPage(1)
  }

  const handleExportarExcel = async () => {
    if (!id) {
      return
    }
    await simulacrosService.exportarResultadosExcel(id, filtrosActivos)
  }

  const handleGenerarReporteAvanzado = async (config: ConfigReporteAvanzadoSimulacro) => {
    if (!id) {
      return
    }

    try {
      setIsGeneratingAdvancedReport(true)
      await simulacrosService.descargarReporteAvanzado(id, {
        ...config,
        ...filtrosActivos,
      })
      setIsReportModalOpen(false)
    } finally {
      setIsGeneratingAdvancedReport(false)
    }
  }

  if (!id) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        No se encontró el simulacro solicitado.
      </section>
    )
  }

  if (cargandoResultados || cargandoAnaliticas) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
        Cargando analíticas del simulacro...
      </section>
    )
  }

  if (errorResultados || errorAnaliticas) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {detalleErrorResultados?.response?.data?.detail ??
          detalleErrorResultados?.response?.data?.detalle ??
          detalleErrorAnaliticas?.response?.data?.detail ??
          detalleErrorAnaliticas?.response?.data?.detalle ??
          'No fue posible cargar los resultados del simulacro.'}
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold uppercase text-usco-vino">RESULTADOS</h1>
        <p className="text-sm text-usco-gris">{simulacroDetalle?.titulo ?? 'Simulacro'}</p>
      </header>

      <div className="rounded-2xl border border-usco-ocre/70 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-usco-gris">
          <Filter className="h-4 w-4" />
          Filtros analíticos
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-usco-gris/80">Programa</span>
            <select
              value={filtroPrograma}
              onChange={(event) => setFiltroPrograma(event.target.value)}
              className="w-full rounded-lg border border-usco-ocre/70 bg-white px-3 py-2 text-sm text-usco-gris focus:border-usco-vino focus:outline-none focus:ring-2 focus:ring-usco-vino/20"
            >
              <option value="">Todos los programas</option>
              {programas.map((programa) => (
                <option key={programa.id} value={programa.id}>
                  {programa.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-usco-gris/80">Género</span>
            <select
              value={filtroGenero}
              onChange={(event) => setFiltroGenero(event.target.value)}
              className="w-full rounded-lg border border-usco-ocre/70 bg-white px-3 py-2 text-sm text-usco-gris focus:border-usco-vino focus:outline-none focus:ring-2 focus:ring-usco-vino/20"
            >
              <option value="">Todos</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-usco-gris/80">Semestre</span>
            <select
              value={filtroSemestre}
              onChange={(event) => setFiltroSemestre(event.target.value)}
              className="w-full rounded-lg border border-usco-ocre/70 bg-white px-3 py-2 text-sm text-usco-gris focus:border-usco-vino focus:outline-none focus:ring-2 focus:ring-usco-vino/20"
            >
              <option value="">Todos</option>
              {Array.from({ length: 14 }, (_, index) => index + 1).map((semestre) => (
                <option key={semestre} value={semestre}>
                  Semestre {semestre}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleResetFiltros}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-usco-gris/30 px-3 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
            >
              <RefreshCcw className="h-4 w-4" />
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => navigate('/simulacros')}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-usco-gris/30 px-3 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-usco-vino p-5 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Promedio Global</p>
          <p className="mt-2 text-4xl font-bold">{formatPuntaje(analiticas?.promedio_global)}</p>
          <p className="mt-2 text-sm text-white/85">Escala 0 - 300 bajo filtros actuales.</p>
        </article>

        <article className="rounded-2xl border border-usco-ocre/70 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-usco-gris/70">Participantes</p>
          <p className="mt-2 text-4xl font-bold text-usco-gris">{resultados.length}</p>
          <p className="mt-2 text-sm text-usco-gris/80">Intentos finalizados en la vista filtrada.</p>
        </article>

        <article className="rounded-2xl border border-usco-ocre/70 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-usco-gris/70">Pregunta más crítica</p>
          <div className="mt-2 text-sm font-semibold text-usco-gris">
            <RichTextRenderer
              content={analiticas?.rendimiento_preguntas?.[0]?.enunciado ?? 'Sin datos suficientes'}
              className="[&_p]:my-0 [&_p]:leading-6 [&_.katex-display]:my-1"
            />
          </div>
          <p className="mt-2 text-sm text-red-700">
            Error: {formatPuntaje(analiticas?.rendimiento_preguntas?.[0]?.error_porcentaje ?? 0)}%
          </p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-usco-ocre/70 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-usco-vino">Promedio por Dificultad</h2>
          <div className="mt-4 space-y-3">
            {(analiticas?.por_dificultad ?? []).length === 0 && (
              <p className="text-sm text-usco-gris">Sin datos para el filtro actual.</p>
            )}
            {(analiticas?.por_dificultad ?? []).map((item) => {
              const porcentaje = Math.max(0, Math.min(100, (Number(item.promedio || 0) / 300) * 100))
              return (
                <div key={item.dificultad} className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-usco-gris">
                    <span>{item.dificultad}</span>
                    <span className="font-semibold">{formatPuntaje(item.promedio)} / 300</span>
                  </div>
                  <div className="h-2 rounded-full bg-usco-fondo">
                    <div
                      className="h-2 rounded-full bg-usco-vino transition-all"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                  <p className="text-xs text-usco-gris/70">{item.participaciones} participaciones</p>
                </div>
              )
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-usco-ocre/70 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-usco-vino">Panel Demográfico</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-usco-ocre/50 p-3">
              <h3 className="text-sm font-semibold text-usco-gris">Desempeño por Género</h3>
              {(analiticas?.por_genero ?? []).length === 0 && (
                <p className="text-xs text-usco-gris">Sin datos</p>
              )}
              {(analiticas?.por_genero ?? []).map((item) => (
                <div key={`${item.genero ?? 'NA'}-${item.genero_nombre}`} className="text-xs text-usco-gris">
                  <div className="flex items-center justify-between">
                    <span>{item.genero_nombre}</span>
                    <span className="font-semibold">{formatPuntaje(item.promedio)}</span>
                  </div>
                  <p className="text-usco-gris/70">{item.participantes} participantes</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-xl border border-usco-ocre/50 p-3">
              <h3 className="text-sm font-semibold text-usco-gris">Desempeño por Semestre</h3>
              {(analiticas?.por_semestre ?? []).length === 0 && (
                <p className="text-xs text-usco-gris">Sin datos</p>
              )}
              {(analiticas?.por_semestre ?? []).slice(0, 8).map((item) => (
                <div key={item.semestre_label} className="text-xs text-usco-gris">
                  <div className="flex items-center justify-between">
                    <span>{item.semestre_label}</span>
                    <span className="font-semibold">{formatPuntaje(item.promedio)}</span>
                  </div>
                  <p className="text-usco-gris/70">{item.participantes} participantes</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-usco-ocre/70 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-usco-vino">Competencias y Categorías</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-usco-fondo">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Competencia
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Categoría
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Promedio
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Participaciones
                </th>
              </tr>
            </thead>
            <tbody>
              {(analiticas?.por_competencia ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-usco-gris">
                    Sin datos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                (analiticas?.por_competencia ?? []).slice(0, 12).map((item, index) => (
                  <tr key={`${item.competencia}-${item.categoria}-${index}`} className="border-b border-usco-fondo/70">
                    <td className="px-3 py-2 text-usco-gris">{item.competencia}</td>
                    <td className="px-3 py-2 text-usco-gris">{item.categoria}</td>
                    <td className="px-3 py-2 text-right font-semibold text-usco-vino">
                      {formatPuntaje(item.promedio)}
                    </td>
                    <td className="px-3 py-2 text-right text-usco-gris">{item.participaciones}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-2xl border border-usco-ocre/70 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-usco-vino">Rendimiento por Pregunta (Top 10 error)</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
            >
              <Settings2 className="h-4 w-4" />
              Generar Reporte Avanzado
            </button>
            <button
              type="button"
              onClick={() => void handleExportarExcel()}
              className="inline-flex items-center gap-2 rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50"
            >
              <Download className="h-4 w-4" />
              Excel rápido
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-usco-fondo">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Pregunta
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Módulo
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-usco-gris">
                  % Acierto
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-usco-gris">
                  % Error
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Participaciones
                </th>
              </tr>
            </thead>
            <tbody>
              {(analiticas?.rendimiento_preguntas ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-sm text-usco-gris">
                    Sin datos de rendimiento por pregunta para este filtro.
                  </td>
                </tr>
              ) : (
                (analiticas?.rendimiento_preguntas ?? []).map((item) => (
                  <tr key={item.pregunta_id} className="border-b border-usco-fondo/70">
                    <td className="px-4 py-3 text-sm text-usco-gris">
                      <RichTextRenderer
                        content={item.enunciado}
                        className="[&_p]:my-0 [&_p]:leading-6 [&_.katex-display]:my-1"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-usco-gris">{item.modulo}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">
                      {formatPuntaje(item.acierto_porcentaje)}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-red-700">
                      {formatPuntaje(item.error_porcentaje)}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-usco-gris">
                      {item.participaciones}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-2xl border border-usco-ocre/70 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-usco-vino" />
          <h2 className="text-lg font-bold text-usco-vino">Tabla Individual</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-usco-fondo">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Posición
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Estudiante
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Programa
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Género
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Semestre
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Fecha Finalización
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Puntaje Global
                </th>
              </tr>
            </thead>
            <tbody>
              {resultados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-sm text-usco-gris">
                    No hay intentos finalizados para este simulacro con los filtros actuales.
                  </td>
                </tr>
              ) : (
                resultadosPaginados.map((resultado, index) => (
                  <tr
                    key={`${resultado.intento_id ?? resultado.estudiante_nombre}-${index}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-usco-fondo/40'}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-usco-gris">
                      #{resultado.posicion ?? (currentPage - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-usco-gris">{resultado.estudiante_nombre}</td>
                    <td className="px-4 py-3 text-sm text-usco-gris">{resultado.programa_nombre}</td>
                    <td className="px-4 py-3 text-sm text-usco-gris">
                      {resultado.genero_nombre ?? 'No especificado'}
                    </td>
                    <td className="px-4 py-3 text-sm text-usco-gris">
                      {resultado.semestre ?? 'Sin dato'}
                    </td>
                    <td className="px-4 py-3 text-sm text-usco-gris">{formatFecha(resultado.fecha_fin)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-usco-vino">
                      {resultado.puntaje_global}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-usco-ocre/80 bg-white px-4 py-3 text-sm text-usco-gris shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            Mostrando {resultadosPaginados.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} -{' '}
            {(currentPage - 1) * PAGE_SIZE + resultadosPaginados.length} de {totalResultados} registros.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-usco-gris/30 px-3 py-1.5 font-medium text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-2 font-semibold text-usco-vino">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-usco-gris/30 px-3 py-1.5 font-medium text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </article>

      <ReportBuilderModal
        isOpen={isReportModalOpen}
        isLoading={isGeneratingAdvancedReport}
        onClose={() => setIsReportModalOpen(false)}
        onGenerate={handleGenerarReporteAvanzado}
      />
    </section>
  )
}

export default ResultadosSimulacroPage
