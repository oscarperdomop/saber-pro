import { useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import usuariosService from '../services/usuariosService'
import type { Programa } from '../../../types/evaluaciones'

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
  rol: 'ADMIN' | 'PROFESOR' | 'ESTUDIANTE'
  is_staff: boolean
  programa_id: string
  genero: '' | 'M' | 'F' | 'O'
  semestre_actual: string
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
  is_staff: false,
  programa_id: '',
  genero: '',
  semestre_actual: '',
  password: '',
}

const SOLO_LETRAS_REGEX = /^[\p{L}\s]+$/u
const CORREO_USCO_REGEX = /^[^\s@]+@usco\.edu\.co$/i

const CrearUsuarioModal = ({ isOpen, onClose, onNotify }: CrearUsuarioModalProps) => {
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues)
  const [errorMessage, setErrorMessage] = useState('')
  const queryClient = useQueryClient()

  const { data: programas = [], isLoading: isProgramasLoading } = useQuery<Programa[]>({
    queryKey: ['programas'],
    queryFn: usuariosService.getProgramas,
    enabled: isOpen,
  })

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
        is_staff: values.rol === 'PROFESOR' ? values.is_staff : values.rol === 'ADMIN',
        programa_id: Number(values.programa_id),
        genero: values.genero || null,
        semestre_actual:
          values.rol === 'ESTUDIANTE' && values.semestre_actual
            ? Number(values.semestre_actual)
            : null,
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

  const handleChange = (field: Exclude<keyof FormValues, 'is_staff'>, value: string) => {
    setFormValues((current) => {
      if (field === 'rol') {
        const nextRole = value as FormValues['rol']
        return {
          ...current,
          rol: nextRole,
          is_staff: nextRole === 'PROFESOR' ? current.is_staff : nextRole === 'ADMIN',
          semestre_actual: nextRole === 'ESTUDIANTE' ? current.semestre_actual : '',
        }
      }

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
    setErrorMessage('')

    const payload: FormValues = {
      nombres: formValues.nombres.trim().toUpperCase(),
      apellidos: formValues.apellidos.trim().toUpperCase(),
      correo_institucional: formValues.correo_institucional.trim().toLowerCase(),
      tipo_documento: formValues.tipo_documento.trim().toUpperCase(),
      numero_documento: formValues.numero_documento.trim(),
      rol: formValues.rol,
      is_staff: formValues.rol === 'PROFESOR' ? formValues.is_staff : formValues.rol === 'ADMIN',
      programa_id: formValues.programa_id,
      genero: formValues.genero,
      semestre_actual: formValues.semestre_actual,
      password: formValues.password.trim(),
    }

    if (
      !payload.nombres ||
      !payload.apellidos ||
      !payload.correo_institucional ||
      !payload.tipo_documento ||
      !payload.numero_documento ||
      !formValues.programa_id
    ) {
      setErrorMessage('Completa todos los campos obligatorios, incluyendo el programa.')
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

    if (!CORREO_USCO_REGEX.test(payload.correo_institucional)) {
      setErrorMessage('El correo institucional debe terminar en @usco.edu.co.')
      return
    }

    if (!/^\d{1,10}$/.test(payload.numero_documento)) {
      setErrorMessage('El nÃºmero de documento debe contener solo nÃºmeros y mÃ¡ximo 10 dÃ­gitos.')
      return
    }

    if (formValues.semestre_actual && Number(formValues.semestre_actual) <= 0) {
      setErrorMessage('El semestre debe ser mayor a 0.')
      return
    }

    if (formValues.rol === 'ESTUDIANTE') {
      const semestre = Number(formValues.semestre_actual)
      if (!formValues.semestre_actual || Number.isNaN(semestre) || semestre < 1 || semestre > 10) {
        setErrorMessage('Para estudiantes, el semestre actual es obligatorio y debe estar entre 1 y 10.')
        return
      }
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 sm:p-4">
      <div className="mx-auto my-2 w-[560px] max-w-full max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-lg bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl sm:my-6 sm:p-6">
        <h2 className="text-xl font-bold text-usco-vino">Nuevo Usuario</h2>

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
              <span className="mb-1 block text-sm font-semibold text-usco-gris">Rol del Usuario</span>
              <select
                value={formValues.rol}
                onChange={(event) => handleChange('rol', event.target.value)}
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
                  id="is_staff_crear"
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
                required
                disabled={isProgramasLoading}
              >
                <option value="" disabled>
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
              <label className="col-span-1 sm:col-span-2">
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

            <label className="col-span-1">
              <span className="mb-1 block text-sm font-semibold text-usco-gris">
                ContraseÃ±a Inicial (Opcional)
              </span>
              <input
                type="text"
                value={formValues.password}
                onChange={(event) => handleChange('password', event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                placeholder="Si lo dejas vacÃ­o, se usa el documento"
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

