import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, Edit, Trash2 } from 'lucide-react'
import usuariosService from '../services/usuariosService'
import CargaMasivaModal from '../components/CargaMasivaModal'
import CrearUsuarioModal from '../components/CrearUsuarioModal'
import EditarUsuarioModal from '../components/EditarUsuarioModal'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import type { Usuario, UsuariosPaginadosResponse } from '../../../types/usuarios'

interface ApiErrorResponse {
  detail?: string
}

const PAGE_SIZE = 10

const UsuariosPage = () => {
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(
    null,
  )
  const queryClient = useQueryClient()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1)
      setSearchTerm(searchInput)
    }, 300)

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
    isFetching,
    isError,
    error,
  } = useQuery<UsuariosPaginadosResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['usuarios', currentPage, searchTerm],
    queryFn: () => usuariosService.getUsuarios(currentPage, PAGE_SIZE, searchTerm),
    placeholderData: keepPreviousData,
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
    },
  })

  const totalUsuarios = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalUsuarios / PAGE_SIZE))

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
    <section className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-usco-vino">Gestion de Usuarios</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-usco-ocre px-4 py-2.5 text-sm font-bold text-usco-vino shadow-sm transition hover:bg-yellow-200"
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

      <div className="rounded-2xl border border-usco-ocre/80 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="w-full rounded-xl border border-usco-ocre/80 px-4 py-2.5 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
        />
        {isFetching && (
          <p className="mt-2 text-xs text-usco-gris/80">Buscando usuarios...</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-usco-ocre/80 bg-white shadow-md sm:rounded-lg">
        <table className="w-full min-w-[980px]">
          <thead className="bg-usco-fondo">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                Nombre Completo
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                Correo
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                Documento
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
                <td colSpan={6} className="px-4 py-6 text-sm text-usco-gris">
                  No se encontraron usuarios con el criterio de busqueda.
                </td>
              </tr>
            )}

            {usuarios.map((usuario, index) => (
              <tr key={String(usuario.id)} className={index % 2 === 0 ? 'bg-white' : 'bg-usco-fondo/40'}>
                <td className="px-4 py-3 text-sm font-medium text-usco-gris">
                  {usuario.nombres} {usuario.apellidos}
                </td>
                <td className="px-4 py-3 text-sm text-usco-gris">{usuario.correo_institucional}</td>
                <td className="px-4 py-3 text-sm text-usco-gris">
                  {usuario.tipo_documento} {usuario.numero_documento}
                </td>
                <td className="px-4 py-3 text-center">
                  {usuario.rol === 'ADMIN' ? (
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                      Administrador
                    </span>
                  ) : usuario.rol === 'PROFESOR' ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        usuario.is_staff
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {usuario.is_staff ? 'Profesor (Staff)' : 'Profesor'}
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                      Estudiante
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
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
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-3 text-usco-gris">
                    <button
                      type="button"
                      onClick={() => setUsuarioEditando(usuario)}
                      className="rounded-md p-1.5 transition hover:bg-usco-fondo hover:text-usco-vino"
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
                      className={`rounded-md p-1.5 transition ${
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
                      className="rounded-md p-1.5 transition hover:bg-usco-fondo hover:text-red-600"
                      aria-label="Eliminar usuario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-usco-ocre/80 bg-white px-4 py-3 text-sm text-usco-gris shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
            Pagina {currentPage} de {totalPages}
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

      {toggleEstadoMutation.isError && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {toggleEstadoMutation.error?.response?.data?.detail ??
            'No fue posible actualizar el estado del usuario.'}
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
    </section>
  )
}

export default UsuariosPage
