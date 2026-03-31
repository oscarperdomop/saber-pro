import { type FormEvent, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { resolveDefaultRoute, resolveUserRole } from '../../../hooks/useAuthStore'
import authService from '../services/authService'
import type { ActivarCuentaPayload } from '../services/authService'
import type { User } from '../../../types/auth'

interface ActivarCuentaErrorResponse {
  detail?: string
  non_field_errors?: string[]
  password_actual?: string[]
  password_nueva?: string[]
  [key: string]: string | string[] | undefined
}

const parseStoredUser = (value: string | null): User | null => {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as User
  } catch {
    return null
  }
}

const extractErrorMessage = (
  error: AxiosError<ActivarCuentaErrorResponse> | null,
): string | null => {
  if (!error) {
    return null
  }

  const responseData = error.response?.data

  if (!responseData) {
    return 'No fue posible activar tu cuenta. Intenta nuevamente.'
  }

  if (typeof responseData.detail === 'string' && responseData.detail.trim().length > 0) {
    return responseData.detail
  }

  const messages = Object.values(responseData)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

  if (messages.length > 0) {
    return messages.join(' ')
  }

  return 'No fue posible activar tu cuenta. Revisa los datos e intenta de nuevo.'
}

const ActivarCuentaPage = () => {
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  const activarCuentaMutation = useMutation<void, AxiosError<ActivarCuentaErrorResponse>, ActivarCuentaPayload>(
    {
      mutationFn: authService.activarCuenta,
      onSuccess: () => {
        const storedUser = parseStoredUser(localStorage.getItem('user'))

        if (storedUser) {
          const updatedUser: User = {
            ...storedUser,
            es_primer_ingreso: false,
          }

          localStorage.setItem('user', JSON.stringify(updatedUser))
        }

        setSuccessMessage('Cuenta activada correctamente. Redirigiendo al dashboard...')
        window.setTimeout(() => {
          const nextRole = resolveUserRole(storedUser)
          navigate(resolveDefaultRoute(nextRole), { replace: true })
        }, 1200)
      },
    },
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessMessage(null)
    activarCuentaMutation.mutate({
      password_actual: passwordActual,
      password_nueva: passwordNueva,
    })
  }

  const errorMessage = useMemo(
    () => extractErrorMessage(activarCuentaMutation.error),
    [activarCuentaMutation.error],
  )

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-usco-fondo px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(143,20,27,0.16),_transparent_50%)]" />

      <section className="relative w-full max-w-xl rounded-3xl border border-usco-ocre bg-white p-8 shadow-xl sm:p-10">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-usco-vino text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-usco-vino">Activa tu cuenta</h1>
          <p className="mt-2 text-sm text-usco-gris">
            Por seguridad, debes cambiar tu contrasena por defecto.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-usco-gris" htmlFor="password_actual">
              Contrasena Actual
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-usco-gris/70" />
              <input
                id="password_actual"
                type="password"
                required
                value={passwordActual}
                onChange={(event) => setPasswordActual(event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/70 py-3 pl-10 pr-4 text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
                placeholder="Ingresa tu contrasena actual"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-usco-gris" htmlFor="password_nueva">
              Nueva Contrasena
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-usco-gris/70" />
              <input
                id="password_nueva"
                type="password"
                required
                value={passwordNueva}
                onChange={(event) => setPasswordNueva(event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/70 py-3 pl-10 pr-4 text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
                placeholder="Define una nueva contrasena segura"
              />
            </div>
          </div>

          {errorMessage && (
            <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-usco-ocre bg-usco-fondo px-4 py-3 text-sm text-usco-vino">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="font-medium">{successMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={activarCuentaMutation.isPending || Boolean(successMessage)}
            className="w-full rounded-xl bg-usco-vino px-4 py-3 font-semibold text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {activarCuentaMutation.isPending ? 'Actualizando...' : 'Activar Cuenta'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default ActivarCuentaPage
