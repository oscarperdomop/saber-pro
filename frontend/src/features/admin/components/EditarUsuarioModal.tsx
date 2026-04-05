import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import usuariosService from '../services/usuariosService'
import type { Programa } from '../../../types/evaluaciones'
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
  rol: 'ADMIN' | 'PROFESOR' | 'ESTUDIANTE'
  is_staff: boolean
  programa_id: string
  genero: '' | 'M' | 'F' | 'O'
  semestre_actual: string
  nueva_password: string
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
  rol: 'ESTUDIANTE',
  is_staff: false,
  programa_id: '',
  genero: '',
  semestre_actual: '',
  nueva_password: '',
}

const SOLO_LETRAS_REGEX = /^[\p{L}\s]+$/u
const CORREO_USCO_REGEX = /^[^\s@]+@usco\.edu\.co$/i

const EditarUsuarioModal = ({ isOpen, onClose, usuario, onNotify }: EditarUsuarioModalProps) => {
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues)
  const [errorMessage, setErrorMessage] = useState('')
  const queryClient = useQueryClient()

  const { data: programas = [], isLoading: isProgramasLoading } = useQuery<Programa[]>({
    queryKey: ['programas'],
    queryFn: usuariosService.getProgramas,
    enabled: isOpen,
  })

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
      rol: usuario.rol ?? 'ESTUDIANTE',
      is_staff: Boolean(usuario.is_staff),
      programa_id: usuario.programa_id ? String(usuario.programa_id) : '',
      genero: usuario.genero ?? '',
      semestre_actual:
        usuario.semestre_actual !== undefined && usuario.semestre_actual !== null
          ? String(usuario.semestre_actual)
          : '',
      nueva_password: '',
    })
    setErrorMessage('')
  }, [usuario])

  const editarUsuarioMutation = useMutation<
    unknown,
    AxiosError<ApiErrorResponse>,
    { id: string | number; data: Partial<Usuario> & { documento: string; password?: string } }
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

  const handleChange = (field: Exclude<keyof FormValues, 'is_staff'>, value: string) => {
    setFormValues((current) => {
      if (field === 'nombres' || field === 'apellidos') {
        const sanitized = value.replace(/[^\p{L}\s]/gu, '')
        return { ...current, [field]: sanitized }
      }

      if (field === 'numero_documento') {
        const sanitized = value.replace(/\D/g, '').slice(0, 10)
        return { ...current, numero_documento: sanitized }
      }

      if (field === 'correo_institucional') {
        return { ...current, correo_institucional: value.toLowerCase() }
      }

      return { ...current, [field]: value }
    })
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
      numero_documento: formValues.numero_documento.trim(),
      rol: formValues.rol,
      is_staff: formValues.is_staff,
      programa_id: formValues.programa_id,
      genero: formValues.genero,
      semestre_actual: formValues.semestre_actual,
      nueva_password: formValues.nueva_password.trim(),
    }

    const normalizedOriginal = {
      nombres: (usuario.nombres ?? '').trim().toUpperCase(),
      apellidos: (usuario.apellidos ?? '').trim().toUpperCase(),
      correo_institucional: (usuario.correo_institucional ?? '').trim().toLowerCase(),
      tipo_documento: (usuario.tipo_documento ?? '').trim().toUpperCase(),
      numero_documento: (usuario.numero_documento ?? '').trim(),
      rol: usuario.rol ?? 'ESTUDIANTE',
      is_staff: Boolean(usuario.is_staff),
      programa_id: usuario.programa_id ? String(usuario.programa_id) : '',
      genero: usuario.genero ?? '',
      semestre_actual:
        usuario.semestre_actual !== undefined && usuario.semestre_actual !== null
          ? String(usuario.semestre_actual)
          : '',
    }

    const hasChanges =
      normalizedCurrent.nombres !== normalizedOriginal.nombres ||
      normalizedCurrent.apellidos !== normalizedOriginal.apellidos ||
      normalizedCurrent.correo_institucional !== normalizedOriginal.correo_institucional ||
      normalizedCurrent.tipo_documento !== normalizedOriginal.tipo_documento ||
      normalizedCurrent.numero_documento !== normalizedOriginal.numero_documento ||
      normalizedCurrent.rol !== normalizedOriginal.rol ||
      normalizedCurrent.is_staff !== normalizedOriginal.is_staff ||
      normalizedCurrent.programa_id !== normalizedOriginal.programa_id ||
      normalizedCurrent.genero !== normalizedOriginal.genero ||
      normalizedCurrent.semestre_actual !== normalizedOriginal.semestre_actual ||
      normalizedCurrent.nueva_password.length > 0

    if (!hasChanges) {
      onNotify({ type: 'info', message: 'Sin cambios por guardar.' })
      onClose()
      return
    }

    if (!SOLO_LETRAS_REGEX.test(formValues.nombres.trim())) {
      setErrorMessage('El campo Nombres solo permite letras.')
      return
    }

    if (!SOLO_LETRAS_REGEX.test(formValues.apellidos.trim())) {
      setErrorMessage('El campo Apellidos solo permite letras.')
      return
    }

    if (!CORREO_USCO_REGEX.test(normalizedCurrent.correo_institucional)) {
      setErrorMessage('El correo institucional debe terminar en @usco.edu.co.')
      return
    }

    if (!/^\d{1,10}$/.test(normalizedCurrent.numero_documento)) {
      setErrorMessage('El nÃºmero de documento debe contener solo nÃºmeros y mÃ¡ximo 10 dÃ­gitos.')
      return
    }

    const payload: Partial<Usuario> & { documento: string; password?: string } = {
      nombres: normalizedCurrent.nombres,
      apellidos: normalizedCurrent.apellidos,
      correo_institucional: normalizedCurrent.correo_institucional,
      tipo_documento: normalizedCurrent.tipo_documento,
      numero_documento: normalizedCurrent.numero_documento,
      documento: normalizedCurrent.numero_documento,
      rol: normalizedCurrent.rol,
      is_staff:
        normalizedCurrent.rol === 'PROFESOR'
          ? normalizedCurrent.is_staff
          : normalizedCurrent.rol === 'ADMIN',
      programa_id: normalizedCurrent.programa_id ? Number(normalizedCurrent.programa_id) : null,
      genero: normalizedCurrent.genero || null,
      semestre_actual:
        normalizedCurrent.rol === 'ESTUDIANTE' && normalizedCurrent.semestre_actual
          ? Number(normalizedCurrent.semestre_actual)
          : null,
    }

    if (normalizedCurrent.nueva_password.length > 0) {
      payload.password = normalizedCurrent.nueva_password
    }

    if (normalizedCurrent.rol === 'ESTUDIANTE') {
      const semestre = Number(normalizedCurrent.semestre_actual)
      if (
        !normalizedCurrent.semestre_actual ||
        Number.isNaN(semestre) ||
        semestre < 1 ||
        semestre > 10
      ) {
        setErrorMessage('Para estudiantes, el semestre actual es obligatorio y debe estar entre 1 y 10.')
        return
      }
    }

    editarUsuarioMutation.mutate({ id: usuario.id, data: payload })
  }

  if (!isOpen || !usuario) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 sm:p-4">
      <div className="mx-auto my-2 w-[500px] max-w-full max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-lg bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl sm:my-6 sm:p-6">
        <h2 className="text-xl font-bold text-usco-vino">Editar Usuario</h2>

        <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                type="text"
                inputMode="email"
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
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Rol del Usuario</span>
              <select
                value={formValues.rol}
                onChange={(event) => {
                  const nextRole = event.target.value as FormValues['rol']
                  setFormValues((current) => ({
                    ...current,
                    rol: nextRole,
                    is_staff:
                      nextRole === 'PROFESOR' ? current.is_staff : nextRole === 'ADMIN',
                    semestre_actual: nextRole === 'ESTUDIANTE' ? current.semestre_actual : '',
                  }))
                }}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              >
                <option value="ESTUDIANTE">Estudiante</option>
                <option value="PROFESOR">Profesor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>

            {formValues.rol === 'PROFESOR' && (
              <label className="col-span-1 sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_staff_editar"
                  checked={formValues.is_staff}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, is_staff: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-usco-vino focus:ring-usco-vino"
                />
                <span className="text-sm text-gray-900">Otorgar acceso administrativo (Staff)</span>
              </label>
            )}

            <label className="col-span-1">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Programa</span>
              <select
                value={formValues.programa_id}
                onChange={(event) => handleChange('programa_id', event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                disabled={isProgramasLoading}
              >
                <option value="">
                  {isProgramasLoading ? 'Cargando programas...' : 'Selecciona un programa'}
                </option>
                {programas.map((programa) => (
                  <option key={programa.id} value={programa.id}>
                    {programa.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="col-span-1">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">
                NÃºmero de Documento
              </span>
              <input
                type="text"
                value={formValues.numero_documento}
                onChange={(event) => handleChange('numero_documento', event.target.value)}
                inputMode="numeric"
                maxLength={10}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                required
              />
            </label>

            <label className="col-span-1">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">GÃ©nero</span>
              <select
                value={formValues.genero}
                onChange={(event) => handleChange('genero', event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
              >
                <option value="">No especificado</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </label>

            {formValues.rol === 'ESTUDIANTE' && (
              <label className="col-span-1">
                <span className="mb-1 block text-sm font-semibold text-usco-gris">Semestre Actual</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formValues.semestre_actual}
                  onChange={(event) => handleChange('semestre_actual', event.target.value)}
                  className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                  placeholder="Ejemplo: 1 - 10"
                  required
                />
              </label>
            )}
          </div>

          <div className="mt-1 border-t border-usco-ocre/60 pt-4">
            <label className="block text-sm font-medium text-usco-gris">
              Restablecer ContraseÃ±a (Opcional)
            </label>
            <input
              type="text"
              value={formValues.nueva_password}
              placeholder="Dejar en blanco para no cambiar"
              onChange={(event) => handleChange('nueva_password', event.target.value)}
              className="mt-1 block w-full rounded-md border border-usco-ocre/80 p-2 text-sm text-usco-gris shadow-sm focus:border-usco-vino focus:ring-usco-vino"
            />
            <p className="mt-1 text-xs text-usco-gris/80">
              Si escribes una clave aquÃ­, reemplazarÃ¡ la actual del estudiante.
            </p>
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

