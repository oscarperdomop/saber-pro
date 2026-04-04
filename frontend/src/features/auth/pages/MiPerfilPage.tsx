import { type FormEvent, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  ChevronDown,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Mail,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react'
import authService from '../services/authService'
import SaberProLoader from '../../../components/ui/SaberProLoader'
import type { MiPerfil } from '../../../types/auth'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
  password_nueva?: string[]
  password?: string[]
  [key: string]: unknown
}

const extractErrorMessage = (error: AxiosError<ApiErrorResponse> | null): string => {
  if (!error?.response?.data) {
    return 'No fue posible actualizar la contraseña.'
  }

  const data = error.response.data
  const direct = data.detail ?? data.detalle
  if (typeof direct === 'string' && direct.trim()) {
    return direct
  }

  const firstField = Object.values(data).find((value) => Array.isArray(value) && value.length > 0)
  if (Array.isArray(firstField) && typeof firstField[0] === 'string') {
    return firstField[0]
  }

  return 'No fue posible actualizar la contraseña.'
}

const MiPerfilPage = () => {
  const [passwordSectionOpen, setPasswordSectionOpen] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const {
    data: perfil,
    isLoading,
    isError,
    error,
  } = useQuery<MiPerfil, AxiosError<ApiErrorResponse>>({
    queryKey: ['miPerfil'],
    queryFn: authService.getMiPerfil,
  })

  const cambiarPasswordMutation = useMutation<
    void,
    AxiosError<ApiErrorResponse>,
    { password_nueva: string }
  >({
    mutationFn: authService.cambiarMiPassword,
    onSuccess: () => {
      setFormMessage('')
      setSuccessMessage('Contraseña actualizada correctamente.')
      setPasswordNueva('')
      setPasswordConfirmar('')
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    },
    onError: (mutationError) => {
      setSuccessMessage('')
      setFormMessage(extractErrorMessage(mutationError))
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessMessage('')
    setFormMessage('')

    if (!passwordNueva.trim() || !passwordConfirmar.trim()) {
      setFormMessage('Debes completar ambos campos de contraseña.')
      return
    }

    if (passwordNueva !== passwordConfirmar) {
      setFormMessage('La confirmación de contraseña no coincide.')
      return
    }

    cambiarPasswordMutation.mutate({ password_nueva: passwordNueva })
  }

  const nombreCompleto = useMemo(() => {
    if (!perfil) {
      return ''
    }
    return `${perfil.nombres} ${perfil.apellidos}`.trim()
  }, [perfil])

  const passwordChecks = useMemo(
    () => [
      { label: 'Mínimo 8 caracteres', valid: passwordNueva.length >= 8 },
      { label: 'Al menos una letra mayúscula', valid: /[A-Z]/.test(passwordNueva) },
      { label: 'Al menos un número', valid: /[0-9]/.test(passwordNueva) },
    ],
    [passwordNueva],
  )

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-usco-ocre/80 bg-white p-6 shadow-sm">
        <SaberProLoader mensaje="Cargando perfil..." />
      </section>
    )
  }

  if (isError || !perfil) {
    return (
      <section className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error?.response?.data?.detail ??
          error?.response?.data?.detalle ??
          'No fue posible cargar la información del perfil.'}
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-usco-vino">MI PERFIL</h1>
        <p className="mt-2 text-sm text-usco-gris">
          Consulta tu información institucional y administra tu seguridad de acceso.
        </p>
      </header>

      <article className="rounded-2xl border border-usco-ocre/70 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-usco-vino/20 bg-usco-vino/10 text-usco-vino">
            <UserCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-usco-vino">Información Personal</h2>
            <p className="text-sm text-usco-gris">Estos datos son de solo lectura.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-usco-ocre/70 bg-usco-fondo/50 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-usco-gris/90">
              <UserCircle2 className="h-3.5 w-3.5" />
              Nombre
            </p>
            <p className="mt-2 text-sm font-semibold text-usco-gris">{nombreCompleto || 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-usco-ocre/70 bg-usco-fondo/50 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-usco-gris/90">
              <Mail className="h-3.5 w-3.5" />
              Correo
            </p>
            <p className="mt-2 text-sm font-semibold text-usco-gris">{perfil.correo_institucional}</p>
          </div>
          <div className="rounded-xl border border-usco-ocre/70 bg-usco-fondo/50 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-usco-gris/90">
              <IdCard className="h-3.5 w-3.5" />
              Documento
            </p>
            <p className="mt-2 text-sm font-semibold text-usco-gris">
              {perfil.tipo_documento} {perfil.numero_documento}
            </p>
          </div>
          <div className="rounded-xl border border-usco-ocre/70 bg-usco-fondo/50 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-usco-gris/90">
              <BookOpen className="h-3.5 w-3.5" />
              Programa
            </p>
            <p className="mt-2 text-sm font-semibold text-usco-gris">{perfil.programa || 'N/A'}</p>
          </div>
        </div>
      </article>

      <article className="relative">
        <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-br from-usco-vino/20 via-usco-ocre/20 to-usco-vino/10 blur-xl" />

        <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/80 shadow-xl backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-usco-vino/5 via-transparent to-usco-ocre/10" />

          <button
            type="button"
            onClick={() => setPasswordSectionOpen((prev) => !prev)}
            className="relative flex w-full items-center justify-between p-6 text-left transition hover:bg-white/40"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-usco-vino to-[#741017] text-white shadow-lg shadow-usco-vino/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-usco-vino">Cambiar Contraseña</h2>
                <p className="text-sm text-usco-gris">Actualiza tu credencial de acceso seguro.</p>
              </div>
            </div>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-usco-vino/10 text-usco-vino transition-transform duration-300 ${
                passwordSectionOpen ? 'rotate-180' : ''
              }`}
            >
              <ChevronDown className="h-5 w-5" />
            </span>
          </button>

          <div
            className={`relative grid overflow-hidden transition-all duration-300 ${
              passwordSectionOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0">
              <form onSubmit={handleSubmit} className="space-y-5 border-t border-usco-ocre/50 p-6">
                <label className="block space-y-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-usco-gris">
                    <KeyRound className="h-4 w-4 text-usco-vino" />
                    Contraseña Nueva
                  </span>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordNueva}
                      onChange={(event) => setPasswordNueva(event.target.value)}
                      className="h-12 w-full rounded-xl border border-usco-ocre/80 bg-white/90 px-3 pr-12 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
                      placeholder="Ingresa la nueva contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-usco-gris/70 transition hover:text-usco-vino"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-usco-gris">
                    <KeyRound className="h-4 w-4 text-usco-vino" />
                    Confirmar Contraseña
                  </span>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordConfirmar}
                      onChange={(event) => setPasswordConfirmar(event.target.value)}
                      className="h-12 w-full rounded-xl border border-usco-ocre/80 bg-white/90 px-3 pr-12 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
                      placeholder="Confirma la nueva contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-usco-gris/70 transition hover:text-usco-vino"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </label>

                <section className="rounded-xl border border-usco-ocre/80 bg-usco-fondo/70 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-usco-vino">
                    Requisitos de contraseña
                  </p>
                  <ul className="space-y-1.5 text-sm text-usco-gris">
                    {passwordChecks.map((check) => (
                      <li key={check.label} className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            check.valid ? 'bg-usco-vino' : 'bg-usco-gris/30'
                          }`}
                        />
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </section>

                {formMessage && (
                  <section className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                    {formMessage}
                  </section>
                )}
                {successMessage && (
                  <section className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-700">
                    {successMessage}
                  </section>
                )}
                {passwordConfirmar && passwordNueva !== passwordConfirmar && (
                  <p className="text-center text-sm text-red-700">Las contraseñas no coinciden.</p>
                )}

                <button
                  type="submit"
                  disabled={
                    cambiarPasswordMutation.isPending ||
                    !passwordNueva ||
                    !passwordConfirmar ||
                    passwordNueva !== passwordConfirmar
                  }
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-usco-vino to-[#741017] px-5 text-sm font-semibold text-white transition hover:from-[#741017] hover:to-usco-vino disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cambiarPasswordMutation.isPending ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}

export default MiPerfilPage
