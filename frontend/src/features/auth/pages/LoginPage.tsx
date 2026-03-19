import { type FormEvent, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Shield,
  Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const LoginPage = () => {
  const [correoInstitucional, setCorreoInstitucional] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);

  const loginMutation = useAuth();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate({
      correo_institucional: correoInstitucional,
      password,
    });
  };

  const errorMessage =
    loginMutation.error?.response?.data?.detail ??
    "Credenciales incorrectas. Verifica tu correo institucional y contrasena.";

  const features = [
    {
      icon: BookOpen,
      title: "Simulacros Saber Pro",
      description: "Practica con evaluaciones similares al examen oficial.",
    },
    {
      icon: BarChart3,
      title: "Analítica de Resultados",
      description: "Monitorea tu avance por modulos y competencias.",
    },
    {
      icon: Users,
      title: "Plataforma USCO",
      description: "Integración académica para estudiantes y docentes.",
    },
  ];

  return (
    <main className="min-h-screen bg-usco-fondo">
      <section className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-usco-vino via-[#7f1017] to-[#4f0d13] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-24 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-usco-ocre/20 blur-3xl" />

          <div className="relative z-10 inline-flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <GraduationCap className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/75">
                Universidad Surcolombiana
              </p>
              <h1 className="text-2xl font-semibold">Saber Pro USCO</h1>
            </div>
          </div>

          <div className="relative z-10 max-w-xl space-y-6">
            <div>
              <h2 className="text-4xl font-bold leading-tight">
                Ingresa a tu entorno académico institucional
              </h2>
              <p className="mt-4 text-lg text-white/80">
                Gestiona simulacros, resultados y analítica con identidad
                oficial USCO.
              </p>
            </div>

            <div className="space-y-4">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-xl bg-white/10 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{feature.title}</h3>
                      <p className="text-sm text-white/75">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <footer className="relative z-10 inline-flex items-center gap-2 text-sm text-white/75">
            <Shield className="h-4 w-4" />
            Plataforma institucional
          </footer>
        </aside>

        <article className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="w-full max-w-lg rounded-2xl border border-usco-ocre/60 bg-white p-8 shadow-[0_12px_40px_rgba(77,98,108,0.16)]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-usco-vino text-white">
                <GraduationCap className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-usco-gris">
                  USCO
                </p>
                <p className="text-xl font-semibold text-usco-vino">
                  Saber Pro
                </p>
              </div>
            </div>

            <header>
              <h2 className="text-3xl font-bold text-usco-vino">
                Inicio de sesión
              </h2>
              <p className="mt-2 text-sm text-usco-gris">
                Accede con tu correo institucional para continuar en la
                plataforma.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="correo_institucional"
                  className="text-sm font-medium text-usco-gris"
                >
                  Correo Institucional
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-usco-gris/75" />
                  <input
                    id="correo_institucional"
                    type="email"
                    autoComplete="email"
                    required
                    value={correoInstitucional}
                    onChange={(event) =>
                      setCorreoInstitucional(event.target.value)
                    }
                    placeholder="usuario@usco.edu.co"
                    className="h-12 w-full rounded-xl border border-usco-ocre/70 px-4 pl-10 text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-usco-gris"
                  >
                    Contraseña
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-usco-vino hover:underline"
                  >
                    Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-usco-gris/75" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    className="h-12 w-full rounded-xl border border-usco-ocre/70 px-4 pl-10 pr-12 text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-usco-gris/70 transition hover:text-usco-vino"
                    aria-label="Mostrar u ocultar contrasena"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-usco-gris">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(event) => setRememberSession(event.target.checked)}
                  className="h-4 w-4 rounded border-usco-ocre text-usco-vino focus:ring-usco-vino"
                />
                Mantener sesión iniciada
              </label>

              {loginMutation.isError && (
                <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-usco-vino px-4 font-semibold text-white transition hover:bg-[#761017] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loginMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-usco-ocre/70" />
              <span className="text-xs uppercase tracking-[0.14em] text-usco-gris/70">
                USCO
              </span>
              <div className="h-px flex-1 bg-usco-ocre/70" />
            </div>

            <p className="text-center text-sm text-usco-gris/90">
              Problemas para ingresar?{" "}
              <button
                type="button"
                className="font-semibold text-usco-vino hover:underline"
              >
                Contacta soporte técnico
              </button>
            </p>
          </div>
        </article>
      </section>
    </main>
  );
};

export default LoginPage;
