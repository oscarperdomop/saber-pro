import { type FormEvent, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const LoginPage = () => {
  const [correoInstitucional, setCorreoInstitucional] = useState('')
  const [password, setPassword] = useState('')
  const loginMutation = useAuth()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loginMutation.mutate({
      correo_institucional: correoInstitucional,
      password,
    })
  }

  const errorMessage =
    loginMutation.error?.response?.data?.detail ??
    'Credenciales incorrectas. Verifica tu correo institucional y contrasena.'

  return (
    <main className="relative min-h-screen overflow-hidden bg-usco-fondo px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(143,20,27,0.15),_transparent_45%)]" />

      <section className="relative mx-auto flex w-full max-w-5xl overflow-hidden rounded-3xl border border-usco-ocre bg-white shadow-xl">
        <aside className="hidden w-1/2 flex-col justify-between bg-usco-vino p-10 text-white lg:flex">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <GraduationCap className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/80">Universidad</p>
              <h1 className="text-2xl font-semibold">Saber Pro USCO</h1>
            </div>
          </div>

          <div>
            <p className="max-w-sm text-lg leading-relaxed text-white/90">
              Plataforma institucional para estudiantes, docentes y administradores.
            </p>
          </div>
        </aside>

        <div className="w-full p-8 sm:p-12 lg:w-1/2">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-usco-vino text-white">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-usco-gris">Universidad</p>
              <p className="text-xl font-semibold text-usco-vino">Saber Pro USCO</p>
            </div>
          </div>

          <header>
            <h2 className="text-3xl font-bold text-usco-vino">Inicio de sesion</h2>
            <p className="mt-2 text-sm text-usco-gris">
              Ingresa con tus credenciales institucionales para continuar.
            </p>
          </header>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-usco-gris"
                htmlFor="correo_institucional"
              >
                Correo Institucional
              </label>
              <input
                id="correo_institucional"
                type="email"
                autoComplete="email"
                required
                value={correoInstitucional}
                onChange={(event) => setCorreoInstitucional(event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/70 px-4 py-3 text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
                placeholder="usuario@usco.edu.co"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-usco-gris" htmlFor="password">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-usco-ocre/70 px-4 py-3 text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
                placeholder="********"
              />
            </div>

            {loginMutation.isError && (
              <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-xl bg-usco-vino px-4 py-3 font-semibold text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loginMutation.isPending ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
