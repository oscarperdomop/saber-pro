import { useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import usuariosService from '../services/usuariosService'

interface CrearUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
  onNotify: (payload: { type: 'success' | 'info'; message: string }) => void
}

interface FormValues {
  nombres: string
  apellidos: string
  correo_institucional: string
  tipo_documento: string
  numero_documento: string
  rol: 'ADMIN' | 'ESTUDIANTE'
  password: string
}

interface ApiErrorResponse {
  detail?: string
  detalle?: string
  message?: string
  [key: string]: string | string[] | undefined
}

const initialFormValues: FormValues = {
  nombres: '',
  apellidos: '',
  correo_institucional: '',
  tipo_documento: 'CC',
  numero_documento: '',
  rol: 'ESTUDIANTE',
  password: '',
}

const CrearUsuarioModal = ({ isOpen, onClose, onNotify }: CrearUsuarioModalProps) => {
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues)
  const [errorMessage, setErrorMessage] = useState('')
  const queryClient = useQueryClient()

  const crearUsuarioMutation = useMutation<
    unknown,
    AxiosError<ApiErrorResponse>,
    FormValues
  >({
    mutationFn: (values) =>
      usuariosService.crearUsuario({
        nombres: values.nombres,
        apellidos: values.apellidos,
        correo_institucional: values.correo_institucional,
        tipo_documento: values.tipo_documento,
        numero_documento: values.numero_documento,
        rol: values.rol,
        password: values.password || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      onNotify({ type: 'success', message: 'Usuario creado correctamente.' })
      setFormValues(initialFormValues)
      setErrorMessage('')
      onClose()
    },
    onError: (error) => {
      const backendData = error.response?.data
      if (!backendData) {
        setErrorMessage('No fue posible crear el usuario.')
        return
      }

      const backendMessage =
        backendData.detalle ??
        backendData.detail ??
        backendData.message ??
        Object.values(backendData)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .find((value) => typeof value === 'string')

      setErrorMessage(backendMessage ?? 'No fue posible crear el usuario.')
    },
  })

  const handleChange = (field: keyof FormValues, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    const payload: FormValues = {
      nombres: formValues.nombres.trim().toUpperCase(),
      apellidos: formValues.apellidos.trim().toUpperCase(),
      correo_institucional: formValues.correo_institucional.trim().toLowerCase(),
      tipo_documento: formValues.tipo_documento.trim().toUpperCase(),
      numero_documento: formValues.numero_documento.trim().toUpperCase(),
      rol: formValues.rol,
      password: formValues.password.trim(),
    }

    if (
      !payload.nombres ||
      !payload.apellidos ||
      !payload.correo_institucional ||
      !payload.tipo_documento ||
      !payload.numero_documento
    ) {
      setErrorMessage('Completa todos los campos obligatorios.')
      return
    }

    crearUsuarioMutation.mutate(payload)
  }

  const handleClose = () => {
    if (crearUsuarioMutation.isPending) {
      return
    }
    setFormValues(initialFormValues)
    setErrorMessage('')
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-[560px] max-w-full rounded-lg bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-usco-vino">Nuevo Usuario</h2>

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

            <label className="col-span-1">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Rol del Usuario</span>
              <select
                value={formValues.rol}
                onChange={(event) => handleChange('rol', event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              >
                <option value="ESTUDIANTE">Estudiante</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>

            <label className="col-span-1">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">
                Contrasena Inicial (Opcional)
              </span>
              <input
                type="text"
                value={formValues.password}
                onChange={(event) => handleChange('password', event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                placeholder="Si lo dejas vacio, se usa el documento"
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
              onClick={handleClose}
              disabled={crearUsuarioMutation.isPending}
              className="rounded-xl border border-usco-gris/30 px-4 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crearUsuarioMutation.isPending}
              className="rounded-xl bg-usco-vino px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#741017] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {crearUsuarioMutation.isPending ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

export default CrearUsuarioModal
