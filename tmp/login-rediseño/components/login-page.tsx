"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  GraduationCap,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  BookOpen,
  Users,
  BarChart3,
  Shield,
} from "lucide-react"

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate login
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
  }

  const features = [
    {
      icon: BookOpen,
      title: "Simulacros Saber Pro",
      description: "Practica con evaluaciones similares al examen oficial",
    },
    {
      icon: BarChart3,
      title: "Analisis de Resultados",
      description: "Visualiza tu progreso y areas de mejora",
    },
    {
      icon: Users,
      title: "Comunidad Academica",
      description: "Conecta con estudiantes y docentes",
    },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1a472a] via-[#1e5631] to-[#2d6a4f] p-12 lg:flex">
        {/* Decorative elements */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b1538]/20 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/70">
                Universidad Surcolombiana
              </p>
              <h1 className="text-xl font-bold text-white">Saber Pro USCO</h1>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight text-white">
              Prepara tu futuro
              <br />
              <span className="text-white/80">academico con nosotros</span>
            </h2>
            <p className="mt-4 max-w-md text-lg text-white/70">
              Plataforma de inteligencia academica para la preparacion integral
              de las pruebas Saber Pro.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-xl bg-white/5 p-4 backdrop-blur-sm transition-all hover:bg-white/10"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-2 text-sm text-white/50">
          <Shield className="h-4 w-4" />
          <span>Plataforma segura con proteccion de datos</span>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full flex-col justify-center bg-background px-8 lg:w-1/2 lg:px-16 xl:px-24">
        {/* Mobile Logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              USCO
            </p>
            <h1 className="font-bold text-foreground">Saber Pro</h1>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">
              Inicio de sesion
            </h2>
            <p className="mt-2 text-muted-foreground">
              Ingresa con tus credenciales institucionales para continuar.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Correo Institucional
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@usco.edu.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10 pr-4"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Contrasena
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Olvidaste tu contrasena?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <label
                htmlFor="remember"
                className="text-sm text-muted-foreground"
              >
                Mantener sesion iniciada
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="h-12 w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                  <span>Ingresando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Iniciar sesion</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-muted-foreground">o</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Alternative Actions */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="h-12 w-full"
              type="button"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google Institucional
            </Button>
          </div>

          {/* Help Text */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Problemas para ingresar?{" "}
            <a href="#" className="font-medium text-primary hover:underline">
              Contacta soporte tecnico
            </a>
          </p>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">
              Terminos de uso
            </a>
            <span>|</span>
            <a href="#" className="hover:text-foreground">
              Politica de privacidad
            </a>
            <span>|</span>
            <a href="#" className="hover:text-foreground">
              Ayuda
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
