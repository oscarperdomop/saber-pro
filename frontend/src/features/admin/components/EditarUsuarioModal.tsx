import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import usuariosService from '../services/usuariosService'
import type { Usuario } from '../../../types/usuarios'

interface EditarUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
  usuario: Usuario | null
  onNotify: (payload: { type: 'success' | 'info'; message: string }) => void
}

interface FormValues {
  nombres: string
  apellidos: string
  correo_institucional: string
  tipo_documento: string
  numero_documento: string
}

interface ApiErrorResponse {
  detail?: string
  detalle?: string
  message?: string
}

const initialFormValues: FormValues = {
  nombres: '',
  apellidos: '',
  correo_institucional: '',
  tipo_documento: 'CC',
  numero_documento: '',
}

const EditarUsuarioModal = ({ isOpen, onClose, usuario, onNotify }: EditarUsuarioModalProps) => {
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues)
  const [errorMessage, setErrorMessage] = useState('')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!usuario) {
      setFormValues(initialFormValues)
      return
    }

    setFormValues({
      nombres: usuario.nombres ?? '',
      apellidos: usuario.apellidos ?? '',
      correo_institucional: usuario.correo_institucional ?? '',
      tipo_documento: usuario.tipo_documento ?? 'CC',
      numero_documento: usuario.numero_documento ?? '',
    })
    setErrorMessage('')
  }, [usuario])

  const editarUsuarioMutation = useMutation<
    unknown,
    AxiosError<ApiErrorResponse>,
    { id: string | number; data: Partial<Usuario> & { documento: string } }
  >({
    mutationFn: ({ id, data }) => usuariosService.editarUsuario({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      onNotify({ type: 'success', message: 'Usuario actualizado correctamente.' })
      onClose()
    },
    onError: (error) => {
      const backendMessage =
        error.response?.data?.detalle ?? error.response?.data?.detail ?? error.response?.data?.message
      setErrorMessage(backendMessage ?? 'No fue posible actualizar el usuario.')
    },
  })

  const handleChange = (field: keyof FormValues, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!usuario) {
      return
    }

    setErrorMessage('')

    const normalizedCurrent = {
      nombres: formValues.nombres.trim().toUpperCase(),
      apellidos: formValues.apellidos.trim().toUpperCase(),
      correo_institucional: formValues.correo_institucional.trim().toLowerCase(),
      tipo_documento: formValues.tipo_documento.trim().toUpperCase(),
      numero_documento: formValues.numero_documento.trim().toUpperCase(),
    }

    const normalizedOriginal = {
      nombres: (usuario.nombres ?? '').trim().toUpperCase(),
      apellidos: (usuario.apellidos ?? '').trim().toUpperCase(),
      correo_institucional: (usuario.correo_institucional ?? '').trim().toLowerCase(),
      tipo_documento: (usuario.tipo_documento ?? '').trim().toUpperCase(),
      numero_documento: (usuario.numero_documento ?? '').trim().toUpperCase(),
    }

    const hasChanges =
      normalizedCurrent.nombres !== normalizedOriginal.nombres ||
      normalizedCurrent.apellidos !== normalizedOriginal.apellidos ||
      normalizedCurrent.correo_institucional !== normalizedOriginal.correo_institucional ||
      normalizedCurrent.tipo_documento !== normalizedOriginal.tipo_documento ||
      normalizedCurrent.numero_documento !== normalizedOriginal.numero_documento

    if (!hasChanges) {
      onNotify({ type: 'info', message: 'Sin cambios por guardar.' })
      onClose()
      return
    }

    const payload: Partial<Usuario> & { documento: string } = {
      nombres: normalizedCurrent.nombres,
      apellidos: normalizedCurrent.apellidos,
      correo_institucional: normalizedCurrent.correo_institucional,
      tipo_documento: normalizedCurrent.tipo_documento,
      numero_documento: normalizedCurrent.numero_documento,
      documento: normalizedCurrent.numero_documento,
    }

    editarUsuarioMutation.mutate({ id: usuario.id, data: payload })
  }

  if (!isOpen || !usuario) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-[500px] max-w-full rounded-lg bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-usco-vino">Editar Usuario</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="col-span-1">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Nombres</span>
              <input
                type="text"
                value={formValues.nombres}
                onChange={(event) => handleChange('nombres', event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              />
            </label>

            <label className="col-span-1">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Apellidos</span>
              <input
                type="text"
                value={formValues.apellidos}
                onChange={(event) => handleChange('apellidos', event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              />
            </label>

            <label className="col-span-1 sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">
                Correo Institucional
              </span>
              <input
                type="email"
                value={formValues.correo_institucional}
                onChange={(event) => handleChange('correo_institucional', event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              />
            </label>

            <label className="col-span-1">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Tipo de Documento</span>
              <select
                value={formValues.tipo_documento}
                onChange={(event) => handleChange('tipo_documento', event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              >
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                <option value="CE">CE</option>
                <option value="PA">PA</option>
                <option value="PEP">PEP</option>
              </select>
            </label>

            <label className="col-span-1">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">
                Numero de Documento
              </span>
              <input
                type="text"
                value={formValues.numero_documento}
                onChange={(event) => handleChange('numero_documento', event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              />
            </label>
          </div>

          {errorMessage && (
            <section className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </section>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={editarUsuarioMutation.isPending}
              className="rounded-xl border border-usco-gris/30 px-4 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={editarUsuarioMutation.isPending}
              className="rounded-xl bg-usco-vino px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#741017] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {editarUsuarioMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

export default EditarUsuarioModal
