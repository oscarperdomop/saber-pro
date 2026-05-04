import { type FormEvent, useState } from "react";
import type { AxiosError } from "axios";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Shield,
  Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface LoginErrorResponse {
  detail?: string | { message?: string; code?: string };
  code?: string;
}

const LoginPage = () => {
  const [correoInstitucional, setCorreoInstitucional] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isInactiveAccountError, setIsInactiveAccountError] = useState(false);

  const loginMutation = useAuth();
  const isValidInstitutionalEmail = correoInstitucional
    .toLowerCase()
    .endsWith("@usco.edu.co");

  const resolveLoginError = (error: unknown) => {
    const axiosError = error as AxiosError<LoginErrorResponse>;
    const errorData = axiosError?.response?.data;

    const backendDetail =
      typeof errorData?.detail === "string"
        ? errorData.detail
        : errorData?.detail?.message ?? "";

    const backendCode =
      errorData?.code ??
      (typeof errorData?.detail === "object" ? errorData.detail?.code : undefined);

    const inactive =
      backendCode === "inactive_account" ||
      (backendDetail ?? "").toLowerCase().includes("cuenta inactiva");

    const message = inactive
      ? "Tu cuenta ha sido desactivada por la institucion. Por favor, comunicate con Soporte Tecnico."
      : backendDetail ||
        "Credenciales incorrectas. Verifica tu correo institucional y contrasena.";

    return { inactive, message };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsInactiveAccountError(false);

    loginMutation.mutate(
      {
        correo_institucional: correoInstitucional,
        password,
      },
      {
        onError: (error) => {
          const parsed = resolveLoginError(error);
          setIsInactiveAccountError(parsed.inactive);
          setLoginError(parsed.message);
        },
        onSuccess: () => {
          setLoginError(null);
          setIsInactiveAccountError(false);
        },
      },
    );
  };

  const features = [
    {
      icon: BookOpen,
      title: "Simulacros Saber Pro",
      description: "Practica con evaluaciones similares al examen oficial.",
    },
    {
      icon: BarChart3,
      title: "Analitica de Resultados",
      description: "Monitorea tu avance por modulos y competencias.",
    },
    {
      icon: Users,
      title: "Plataforma USCO",
      description: "Integracion academica para estudiantes y docentes.",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f5f5f7] via-[#fafafa] to-[#f0f0f2] lg:bg-usco-fondo">
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
                Ingresa a tu entorno academico institucional
              </h2>
              <p className="mt-4 text-lg text-white/80">
                Gestiona simulacros, resultados y Analitica con identidad
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
          <div className="w-full max-w-[420px] lg:hidden">
            <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/90 shadow-[0_12px_60px_rgba(0,0,0,0.1)] backdrop-blur-xl">
              <div className="px-8 pb-5 pt-8 text-center">
                <div className="mx-auto mb-2 h-28 w-28">
                  <img
                    src="/images/logo-usco-saber-pro.png"
                    alt="USCO Saber Pro"
                    className="h-full w-full object-contain drop-shadow-sm"
                  />
                </div>
              </div>

              <div className="relative mx-8">
                <div className="h-px bg-gradient-to-r from-transparent via-[#006633]/25 to-transparent" />
                <div className="absolute inset-0 h-px translate-y-px bg-gradient-to-r from-transparent via-[#8B1538]/15 to-transparent" />
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-8">
                <header className="mb-6">
                  <h2 className="text-[28px] font-bold tracking-tight text-[#1c1c1e]">
                    Inicio de sesion
                  </h2>
                  <p className="mt-1 text-[15px] text-[#8e8e93]">
                    Accede con tu correo institucional
                  </p>
                </header>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="correo_institucional_mobile"
                      className="mb-2 ml-1 block text-[13px] font-medium text-[#3c3c43]/60"
                    >
                      Correo Institucional
                    </label>
                    <div className="relative flex items-center rounded-xl border border-transparent bg-[#f2f2f7] transition focus-within:border-[#006633]/20 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#006633]/40">
                      <div className="pl-4 pr-2">
                        <Mail className="h-5 w-5 text-[#8e8e93]" strokeWidth={1.5} />
                      </div>
                      <input
                        id="correo_institucional_mobile"
                        type="email"
                        autoComplete="email"
                        required
                        value={correoInstitucional}
                        onChange={(event) =>
                          setCorreoInstitucional(event.target.value)
                        }
                        placeholder="usuario@usco.edu.co"
                        className="h-14 w-full bg-transparent py-4 pr-4 text-[17px] text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
                      />
                      {isValidInstitutionalEmail && (
                        <div className="pr-4">
                          <CheckCircle2 className="h-5 w-5 text-[#34c759]" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 ml-1 flex items-center justify-between">
                      <label
                        htmlFor="password_mobile"
                        className="text-[13px] font-medium text-[#3c3c43]/60"
                      >
                        Contrasena
                      </label>
                      <button
                        type="button"
                        className="text-[13px] font-medium text-[#8B1538] transition-colors hover:text-[#6d1029]"
                      >
                        Olvidaste tu contrasena?
                      </button>
                    </div>
                    <div className="relative flex items-center rounded-xl border border-transparent bg-[#f2f2f7] transition focus-within:border-[#006633]/20 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#006633]/40">
                      <div className="pl-4 pr-2">
                        <Lock className="h-5 w-5 text-[#8e8e93]" strokeWidth={1.5} />
                      </div>
                      <input
                        id="password_mobile"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="********"
                        className="h-14 w-full bg-transparent py-4 text-[17px] text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((previous) => !previous)}
                        className="px-4 py-2 text-[#8e8e93] transition-colors hover:text-[#1c1c1e]"
                        aria-label="Mostrar u ocultar contrasena"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" strokeWidth={1.5} />
                        ) : (
                          <Eye className="h-5 w-5" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-6 mt-4 flex items-center justify-between py-2">
                  <span className="text-[15px] text-[#1c1c1e]">
                    Mantener sesion iniciada
                  </span>
                  <button
                    type="button"
                    onClick={() => setRememberSession((previous) => !previous)}
                    aria-pressed={rememberSession}
                    className={`relative h-[31px] w-[51px] rounded-full transition-colors duration-300 ${
                      rememberSession ? "bg-[#006633]" : "bg-[#e9e9eb]"
                    }`}
                  >
                    <span
                      className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform duration-300 ${
                        rememberSession ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {loginError && (
                  <div
                    className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                      isInactiveAccountError
                        ? "border-red-400 bg-red-100 text-red-800"
                        : "border-red-300 bg-red-50 text-red-700"
                    }`}
                  >
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B1538] to-[#a91d45] px-4 text-[17px] font-semibold text-white shadow-lg shadow-[#8B1538]/30 transition hover:shadow-xl hover:shadow-[#8B1538]/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loginMutation.isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Iniciando sesion...
                    </>
                  ) : (
                    <>
                      Iniciar sesion
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mx-6 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />

              <div className="px-6 py-5 text-center">
                <p className="mb-1 text-[13px] text-[#8e8e93]">
                  Problemas para ingresar?
                </p>
                <button
                  type="button"
                  className="text-[15px] font-medium text-[#006633] transition-colors hover:text-[#004d26]"
                >
                  Contacta soporte tecnico
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-[13px] text-[#8e8e93]">
              Universidad Surcolombiana (c) 2026
            </p>
          </div>

          <div className="hidden w-full max-w-lg rounded-2xl border border-usco-ocre/60 bg-white p-8 shadow-[0_12px_40px_rgba(77,98,108,0.16)] lg:block">
            <header>
              <h2 className="text-3xl font-bold text-usco-vino">Inicio de sesion</h2>
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
                    Contrasena
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-usco-vino hover:underline"
                  >
                    Olvidaste tu contrasena?
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
                Mantener sesion iniciada
              </label>

              {loginError && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    isInactiveAccountError
                      ? "border-red-400 bg-red-100 text-red-800"
                      : "border-red-300 bg-red-50 text-red-700"
                  }`}
                >
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-usco-vino px-4 font-semibold text-white transition hover:bg-[#761017] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loginMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Iniciando sesion...
                  </>
                ) : (
                  <>
                    Iniciar sesion
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
                Contacta soporte tecnico
              </button>
            </p>
          </div>
        </article>
      </section>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden lg:hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-[#006633]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#8B1538]/10 blur-3xl" />
      </div>
    </main>
  );
};

export default LoginPage;
