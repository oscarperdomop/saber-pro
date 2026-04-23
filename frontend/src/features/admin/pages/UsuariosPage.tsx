import { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  Check,
  Download,
  Edit,
  Filter,
  GraduationCap,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import usuariosService from '../services/usuariosService'
import CargaMasivaModal from '../components/CargaMasivaModal'
import CrearUsuarioModal from '../components/CrearUsuarioModal'
import EditarUsuarioModal from '../components/EditarUsuarioModal'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import type { Programa } from '../../../types/evaluaciones'
import type {
  Usuario,
  UsuariosDashboardStatsResponse,
  UsuariosPaginadosResponse,
} from '../../../types/usuarios'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
}

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 400

const getPercent = (value: number, total: number) => {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

const getRoleBadgeConfig = (usuario: Usuario) => {
  if (usuario.rol === 'ADMIN') {
    return {
      label: 'Administrador',
      className: 'bg-[#F4EAF1] text-[#7A1A3A]',
    }
  }

  if (usuario.rol === 'PROFESOR') {
    return {
      label: usuario.is_staff ? 'Profesor (Staff)' : 'Profesor',
      className: usuario.is_staff ? 'bg-[#FFF6E9] text-[#9A4D00]' : 'bg-slate-100 text-slate-700',
    }
  }

  return {
    label: 'Estudiante',
    className: 'bg-[#E8F0FE] text-[#1E40AF]',
  }
}

const UsuariosPage = () => {
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'' | 'true' | 'false'>('')
  const [filtroPrograma, setFiltroPrograma] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [usuarioPendienteEliminar, setUsuarioPendienteEliminar] = useState<Usuario | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(
    null,
  )
  const [isDownloadingReporte, setIsDownloadingReporte] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = searchInput.trim().replace(/\s+/g, ' ')
      setCurrentPage((page) => (page === 1 ? page : 1))
      setSearchTerm((prev) => (prev === normalizedSearch ? prev : normalizedSearch))
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    if (!notification) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setNotification(null)
    }, 3200)

    return () => window.clearTimeout(timeoutId)
  }, [notification])

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<UsuariosPaginadosResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['usuarios', currentPage, searchTerm, filtroRol, filtroEstado, filtroPrograma, filtroSemestre],
    queryFn: () =>
      usuariosService.getUsuarios(currentPage, PAGE_SIZE, searchTerm, {
        rol: filtroRol,
        is_active: filtroEstado,
        programa: filtroPrograma,
        semestre: filtroSemestre,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const { data: programasFiltro = [] } = useQuery<Programa[], AxiosError<ApiErrorResponse>>({
    queryKey: ['usuariosProgramasFiltro'],
    queryFn: usuariosService.getProgramas,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const {
    data: dashboardStats,
    isLoading: isLoadingDashboardStats,
    isError: isErrorDashboardStats,
  } = useQuery<UsuariosDashboardStatsResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['usuariosDashboardStats'],
    queryFn: usuariosService.getUsuariosDashboardStats,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const usuarios: Usuario[] = data?.results ?? []

  const toggleEstadoMutation = useMutation<
    unknown,
    AxiosError<ApiErrorResponse>,
    { id: string | number; is_active: boolean }
  >({
    mutationFn: usuariosService.toggleEstadoUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['usuariosDashboardStats'] })
    },
  })

  const eliminarUsuarioMutation = useMutation({
    mutationFn: usuariosService.eliminarUsuario,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['usuariosDashboardStats'] })
      setNotification({
        type: 'success',
        message:
          response?.mensaje ??
          (response?.tipo_eliminacion === 'fisica'
            ? 'Usuario eliminado permanentemente.'
            : 'Usuario desactivado por tener intentos registrados.'),
      })
    },
  })

  const confirmarEliminarUsuario = () => {
    if (!usuarioPendienteEliminar) {
      return
    }

    const usuarioId = usuarioPendienteEliminar.id
    setUsuarioPendienteEliminar(null)
    eliminarUsuarioMutation.mutate(usuarioId)
  }

  const totalUsuarios = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalUsuarios / PAGE_SIZE))
  const totalAdmins = dashboardStats?.por_rol?.admin ?? 0
  const totalProfesores = dashboardStats?.por_rol?.profesor ?? 0

  const generoTotal = (dashboardStats?.por_genero ?? []).reduce(
    (acc, item) => acc + Number(item.total || 0),
    0,
  )
  const maxPrograma = Math.max(
    1,
    ...(dashboardStats?.por_programa ?? []).map((item) => Number(item.total || 0)),
  )
  const maxSemestre = Math.max(
    1,
    ...(dashboardStats?.por_semestre ?? []).map((item) => Number(item.total || 0)),
  )
  const programaTotal = (dashboardStats?.por_programa ?? []).reduce(
    (acc, item) => acc + Number(item.total || 0),
    0,
  )

  const programasTop = useMemo(() => {
    return [...(dashboardStats?.por_programa ?? [])].sort((a, b) => b.total - a.total).slice(0, 6)
  }, [dashboardStats?.por_programa])

  const filtroRolLabel = useMemo(() => {
    if (!filtroRol) return 'Todos los roles'
    if (filtroRol === 'ADMIN') return 'Administrador'
    if (filtroRol === 'PROFESOR') return 'Profesor'
    if (filtroRol === 'ESTUDIANTE') return 'Estudiante'
    return filtroRol
  }, [filtroRol])

  const filtroEstadoLabel = useMemo(() => {
    if (filtroEstado === 'true') return 'Activos'
    if (filtroEstado === 'false') return 'Inactivos'
    return 'Cualquier estado'
  }, [filtroEstado])

  const filtroProgramaLabel = useMemo(() => {
    if (!filtroPrograma) return 'Todos los programas'
    return (
      programasFiltro.find((programa) => String(programa.id) === filtroPrograma)?.nombre ??
      filtroPrograma
    )
  }, [filtroPrograma, programasFiltro])

  const opcionesSemestreFiltro = useMemo(() => {
    return (dashboardStats?.por_semestre ?? [])
      .filter((item) => item.semestre !== null && item.semestre !== undefined)
      .map((item) => ({
        value: String(item.semestre),
        label: item.semestre_nombre || `Semestre ${item.semestre}`,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value))
  }, [dashboardStats?.por_semestre])

  const filtroSemestreLabel = useMemo(() => {
    if (!filtroSemestre) return 'Todos los semestres'
    return (
      opcionesSemestreFiltro.find((semestre) => semestre.value === filtroSemestre)?.label ??
      `Semestre ${filtroSemestre}`
    )
  }, [filtroSemestre, opcionesSemestreFiltro])

  const handleDownloadReport = async () => {
    if (isDownloadingReporte) {
      return
    }

    const normalizedSearch = searchInput.trim().replace(/\s+/g, ' ')
    setIsDownloadingReporte(true)
    try {
      await usuariosService.descargarReporteUsuariosExcel(normalizedSearch, {
        rol: filtroRol,
        is_active: filtroEstado,
        programa: filtroPrograma,
        semestre: filtroSemestre,
      })
      setNotification({
        type: 'success',
        message: 'Reporte de usuarios descargado correctamente.',
      })
    } catch {
      setNotification({
        type: 'info',
        message: 'No fue posible descargar el reporte de usuarios. Intenta nuevamente.',
      })
    } finally {
      setIsDownloadingReporte(false)
    }
  }

  if (isLoading && !data) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 shadow-sm">
        <SaberProLoader mensaje="Cargando usuarios..." />
      </section>
    )
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error.response?.data?.detail ?? 'No fue posible cargar los usuarios.'}
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-usco-vino">GESTIÓN DE USUARIOS</h1>
          <p className="mt-1 text-sm text-usco-gris">
            Centro de control para creación, seguimiento y administración de cuentas.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl border border-usco-ocre/90 bg-usco-ocre px-4 py-2.5 text-sm font-bold text-usco-vino shadow-sm transition hover:bg-yellow-200"
          >
            Carga Masiva (Excel)
          </button>
          <button
            type="button"
            onClick={() => setIsCrearModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-usco-vino px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#741017]"
          >
            + Nuevo Usuario
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-usco-ocre/75 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-usco-gris/70">
                Total Usuarios
              </p>
              <p className="mt-2 text-3xl font-black text-usco-vino">
                {isLoadingDashboardStats ? '...' : dashboardStats?.total_usuarios ?? 0}
              </p>
              <p className="mt-1 text-xs font-medium text-usco-gris">Base institucional registrada</p>
            </div>
            <div className="rounded-xl bg-[#F6EDEF] p-2.5 text-usco-vino">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-green-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-usco-gris/70">
                Usuarios Activos
              </p>
              <p className="mt-2 text-3xl font-black text-green-700">
                {isLoadingDashboardStats ? '...' : dashboardStats?.usuarios_activos ?? 0}
              </p>
              <p className="mt-1 text-xs font-medium text-usco-gris">Cuentas operativas</p>
            </div>
            <div className="rounded-xl bg-green-50 p-2.5 text-green-700">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-usco-ocre/75 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-usco-gris/70">
                Estudiantes
              </p>
              <p className="mt-2 text-3xl font-black text-usco-gris">
                {isLoadingDashboardStats ? '...' : dashboardStats?.total_estudiantes ?? 0}
              </p>
              <p className="mt-1 text-xs font-medium text-usco-gris">Población académica</p>
            </div>
            <div className="rounded-xl bg-usco-fondo p-2.5 text-usco-gris">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-usco-ocre/75 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-usco-gris/70">
                Control Administrativo
              </p>
              <p className="mt-2 text-3xl font-black text-usco-vino">
                {isLoadingDashboardStats ? '...' : totalAdmins + totalProfesores}
              </p>
              <p className="mt-1 text-xs font-medium text-usco-gris">
                {totalAdmins} admin · {totalProfesores} profesor
              </p>
            </div>
            <div className="rounded-xl bg-[#F6EDEF] p-2.5 text-usco-vino">
              <Shield className="h-5 w-5" />
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <article className="rounded-2xl border border-usco-ocre/75 bg-white p-4 shadow-sm xl:col-span-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-usco-vino">Distribución por Género</h2>
          {isLoadingDashboardStats ? (
            <div className="mt-4 h-28 animate-pulse rounded-xl bg-usco-fondo" />
          ) : (dashboardStats?.por_genero ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-usco-gris">Sin datos de género.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {(dashboardStats?.por_genero ?? []).map((item) => {
                const width = getPercent(item.total, generoTotal)
                return (
                  <div key={`${item.genero}-${item.genero_nombre}`}>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-usco-gris">
                      <span>{item.genero_nombre}</span>
                      <span>
                        {item.total} ({width}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-usco-vino" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-usco-ocre/75 bg-white p-4 shadow-sm xl:col-span-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-usco-vino">Estudiantes por Programa</h2>
          {isLoadingDashboardStats ? (
            <div className="mt-4 h-28 animate-pulse rounded-xl bg-usco-fondo" />
          ) : programasTop.length === 0 ? (
            <p className="mt-4 text-sm text-usco-gris">Sin datos por programa.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {programasTop.map((item) => {
                const width = Math.round((item.total / maxPrograma) * 100)
                return (
                  <div key={`${item.programa}-${item.total}`}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-usco-gris">
                      <span className="max-w-[75%] truncate">{item.programa}</span>
                      <span>
                        {item.total} ({getPercent(item.total, programaTotal)}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-usco-gris" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-usco-ocre/75 bg-white p-4 shadow-sm xl:col-span-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-usco-vino">
            Distribución por Semestre
          </h2>
          {isLoadingDashboardStats ? (
            <div className="mt-4 h-24 animate-pulse rounded-xl bg-usco-fondo" />
          ) : (dashboardStats?.por_semestre ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-usco-gris">Sin datos por semestre.</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {(dashboardStats?.por_semestre ?? []).slice(0, 7).map((item) => {
                const width = Math.round((item.total / maxSemestre) * 100)
                return (
                  <div key={`${item.semestre}-${item.semestre_nombre}`} className="rounded-xl border border-usco-ocre/50 p-2.5">
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-usco-gris">
                      <span>{item.semestre_nombre}</span>
                      <span>{item.total}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-usco-vino" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>
      </section>

      {isErrorDashboardStats && (
        <section className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-800">
          No fue posible cargar las estadísticas del dashboard de usuarios.
        </section>
      )}

      {notification && (
        <section
          className={`rounded-xl border p-4 text-sm shadow-sm ${
            notification.type === 'success'
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-blue-300 bg-blue-50 text-blue-800'
          }`}
        >
          {notification.message}
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-usco-ocre/80 bg-white shadow-sm">
        <div className="border-b border-usco-ocre/70 p-4">
          <div className="grid grid-cols-1 gap-3">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-usco-gris/70" />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre completo, correo o documento..."
                className="w-full rounded-xl border border-usco-ocre/80 px-4 py-2.5 pl-10 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="relative">
                <select
                  value={filtroRol}
                  onChange={(event) => {
                    setFiltroRol(event.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full appearance-none rounded-xl border border-usco-ocre/80 bg-white px-4 py-2.5 pr-10 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                >
                  <option value="">Todos los roles</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="PROFESOR">Profesor</option>
                  <option value="ESTUDIANTE">Estudiante</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-usco-gris/70">
                  v
                </span>
              </div>

              <div className="relative">
                <select
                  value={filtroEstado}
                  onChange={(event) => {
                    setFiltroEstado(event.target.value as '' | 'true' | 'false')
                    setCurrentPage(1)
                  }}
                  className="w-full appearance-none rounded-xl border border-usco-ocre/80 bg-white px-4 py-2.5 pr-10 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                >
                  <option value="">Cualquier estado</option>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-usco-gris/70">
                  v
                </span>
              </div>

              <div className="relative">
                <select
                  value={filtroPrograma}
                  onChange={(event) => {
                    setFiltroPrograma(event.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full appearance-none rounded-xl border border-usco-ocre/80 bg-white px-4 py-2.5 pr-10 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                >
                  <option value="">Todos los programas</option>
                  {programasFiltro.map((programa) => (
                    <option key={programa.id} value={String(programa.id)}>
                      {programa.nombre}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-usco-gris/70">
                  v
                </span>
              </div>

              <div className="relative">
                <select
                  value={filtroSemestre}
                  onChange={(event) => {
                    setFiltroSemestre(event.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full appearance-none rounded-xl border border-usco-ocre/80 bg-white px-4 py-2.5 pr-10 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                >
                  <option value="">Todos los semestres</option>
                  {opcionesSemestreFiltro.map((semestre) => (
                    <option key={semestre.value} value={semestre.value}>
                      {semestre.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-usco-gris/70">
                  v
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 text-xs text-usco-gris lg:flex-row lg:items-center lg:justify-between">
            <p>
              Mostrando {usuarios.length} resultado{usuarios.length === 1 ? '' : 's'} en esta página.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <p className="inline-flex items-center gap-1 font-medium">
                <Filter className="h-3.5 w-3.5" />
                Filtros: {filtroRolLabel} | {filtroEstadoLabel} | {filtroProgramaLabel} | {filtroSemestreLabel}
              </p>
              <button
                type="button"
                onClick={handleDownloadReport}
                disabled={isDownloadingReporte}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-usco-ocre/90 bg-white px-3 py-1.5 text-xs font-semibold text-usco-vino shadow-sm transition hover:bg-usco-fondo disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Download className="h-3.5 w-3.5" />
                {isDownloadingReporte ? 'Generando reporte...' : 'Descargar Reporte (Excel)'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead className="bg-usco-fondo">
              <tr className="border-b border-usco-ocre/70">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Correo
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Documento
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Programa
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Rol
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-usco-gris">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-usco-gris">
                    No se encontraron usuarios con el criterio de búsqueda.
                  </td>
                </tr>
              )}

              {usuarios.map((usuario) => {
                const roleBadge = getRoleBadgeConfig(usuario)
                const initialA = usuario.nombres?.trim().charAt(0)?.toUpperCase() ?? ''
                const initialB = usuario.apellidos?.trim().charAt(0)?.toUpperCase() ?? ''
                return (
                  <tr key={String(usuario.id)} className="border-b border-usco-ocre/40 bg-white align-middle">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6EDEF] text-sm font-bold text-usco-vino">
                          {initialA}
                          {initialB}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-usco-gris">
                            {usuario.nombres} {usuario.apellidos}
                          </p>
                          <p className="text-xs text-usco-gris/75">
                            {usuario.tipo_documento} {usuario.numero_documento}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-sm text-usco-gris">{usuario.correo_institucional}</td>

                    <td className="px-4 py-3.5 text-sm text-usco-gris">
                      {usuario.tipo_documento} {usuario.numero_documento}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-usco-gris">
                      {usuario.programa || 'Sin programa'}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleBadge.className}`}>
                        {roleBadge.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {usuario.is_active ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                          Inactivo
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-2.5 text-usco-gris">
                        <button
                          type="button"
                          onClick={() => setUsuarioEditando(usuario)}
                          className="rounded-lg p-1.5 transition hover:bg-usco-fondo hover:text-usco-vino"
                          title="Editar"
                          aria-label="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toggleEstadoMutation.mutate({
                              id: usuario.id,
                              is_active: !usuario.is_active,
                            })
                          }
                          className={`rounded-lg p-1.5 transition ${
                            usuario.is_active
                              ? 'text-gray-500 hover:bg-usco-fondo hover:text-red-700'
                              : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                          }`}
                          title={usuario.is_active ? 'Desactivar' : 'Activar'}
                          aria-label={usuario.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {usuario.is_active ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUsuarioPendienteEliminar(usuario)}
                          disabled={eliminarUsuarioMutation.isPending}
                          className="rounded-lg p-1.5 transition hover:bg-usco-fondo hover:text-red-600"
                          title="Eliminar"
                          aria-label="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-usco-ocre/70 bg-white px-4 py-3 text-sm text-usco-gris sm:flex-row sm:items-center sm:justify-between">
          <p>
            Mostrando {usuarios.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} -{' '}
            {(currentPage - 1) * PAGE_SIZE + usuarios.length} de {totalUsuarios} usuarios.
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
      </section>

      {toggleEstadoMutation.isError && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {toggleEstadoMutation.error?.response?.data?.detail ??
            'No fue posible actualizar el estado del usuario.'}
        </section>
      )}

      {eliminarUsuarioMutation.isError && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {(eliminarUsuarioMutation.error as AxiosError<ApiErrorResponse>)?.response?.data?.detail ??
            (eliminarUsuarioMutation.error as AxiosError<ApiErrorResponse>)?.response?.data?.detalle ??
            'No fue posible eliminar el usuario.'}
        </section>
      )}

      <CargaMasivaModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <CrearUsuarioModal
        isOpen={isCrearModalOpen}
        onClose={() => setIsCrearModalOpen(false)}
        onNotify={setNotification}
      />
      <EditarUsuarioModal
        isOpen={usuarioEditando !== null}
        onClose={() => setUsuarioEditando(null)}
        usuario={usuarioEditando}
        onNotify={setNotification}
      />

      <ConfirmDialog
        open={Boolean(usuarioPendienteEliminar)}
        title="Eliminar usuario"
        message="Si el usuario no tiene intentos de examen se eliminará de forma permanente. Si ya tiene intentos, se desactivará (eliminación lógica)."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={eliminarUsuarioMutation.isPending}
        onConfirm={confirmarEliminarUsuario}
        onCancel={() => setUsuarioPendienteEliminar(null)}
      />
    </section>
  )
}

export default UsuariosPage
