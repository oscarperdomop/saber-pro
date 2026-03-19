"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  User,
  BookOpen,
  LogOut,
  ChevronLeft,
  Bell,
  Search,
  Play,
  Clock,
  FileText,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  ChevronRight,
  Sparkles,
  Lock,
  CheckCircle2,
  Timer,
  Award,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, active: true },
  { name: "Mi Perfil", icon: User, active: false },
  { name: "Evaluaciones", icon: BookOpen, active: false },
]

const simulacros = [
  {
    id: 1,
    title: "Simulacro Oficial Saber Pro 2026-1",
    description: "Primer simulacro general para evaluar competencias genéricas.",
    duration: 120,
    questions: 180,
    difficulty: "Intermedio",
    modules: ["Lectura Crítica", "Razonamiento Cuantitativo", "Competencias Ciudadanas", "Comunicación Escrita", "Inglés"],
    available: true,
    deadline: "30 de Abril, 2026",
  },
  {
    id: 2,
    title: "Simulacro Competencias Específicas",
    description: "Evalúa tus conocimientos específicos de tu programa académico.",
    duration: 90,
    questions: 60,
    difficulty: "Avanzado",
    modules: ["Competencias Específicas"],
    available: true,
    deadline: "15 de Mayo, 2026",
  },
  {
    id: 3,
    title: "Mini Simulacro - Lectura Crítica",
    description: "Práctica enfocada en el módulo de lectura crítica.",
    duration: 45,
    questions: 35,
    difficulty: "Básico",
    modules: ["Lectura Crítica"],
    available: false,
    deadline: "Próximamente",
  },
]

const resultados = [
  {
    id: 1,
    title: "Simulacro Diagnóstico 2025-2",
    date: "15 Feb 2026",
    score: 285,
    maxScore: 300,
    percentile: 92,
    modules: [
      { name: "Lectura Crítica", score: 196, percentile: 94 },
      { name: "Razonamiento Cuantitativo", score: 171, percentile: 76 },
      { name: "Competencias Ciudadanas", score: 207, percentile: 98 },
    ],
  },
]

export function SimulacrosPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState("Dashboard")

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? "w-[70px]" : "w-[240px]"
          } flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300`}
        >
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                  <Sparkles className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                    Saber Pro
                  </p>
                  <p className="text-lg font-bold text-primary">USCO</p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Sparkles className="h-4 w-4 text-accent-foreground" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navigation.map((item) => (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveNav(item.name)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      activeNav === item.name
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                    {!sidebarCollapsed && activeNav === item.name && (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">{item.name}</TooltipContent>
                )}
              </Tooltip>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                  <LogOut className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span>Cerrar Sesión</span>}
                </button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right">Cerrar Sesión</TooltipContent>
              )}
            </Tooltip>
            {!sidebarCollapsed && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-sidebar-accent/30 px-3 py-2">
                <Lock className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-sidebar-foreground/60">
                  Área Segura
                </span>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-9 w-9"
              >
                <ChevronLeft
                  className={`h-5 w-5 transition-transform ${
                    sidebarCollapsed ? "rotate-180" : ""
                  }`}
                />
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar simulacros..."
                  className="h-9 w-[280px] bg-muted/50 pl-9 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  2
                </span>
              </Button>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Usuario</p>
                  <p className="text-sm font-semibold">Paula Andrea</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  PA
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-6xl p-6">
              {/* Welcome Section */}
              <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-6 text-primary-foreground shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
                      Preparación Saber Pro
                    </p>
                    <h1 className="mt-1 text-3xl font-bold">
                      Hola, Paula Andrea
                    </h1>
                    <p className="mt-2 max-w-lg text-sm text-primary-foreground/80">
                      Este es tu tablero de avance. Aquí ves qué simulacros tienes
                      activos y cómo te fue en intentos anteriores.
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
                          <Target className="h-8 w-8" />
                        </div>
                        <p className="mt-2 text-2xl font-bold">2</p>
                        <p className="text-xs text-primary-foreground/70">Disponibles</p>
                      </div>
                      <div className="text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
                          <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <p className="mt-2 text-2xl font-bold">1</p>
                        <p className="text-xs text-primary-foreground/70">Completados</p>
                      </div>
                      <div className="text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
                          <TrendingUp className="h-8 w-8" />
                        </div>
                        <p className="mt-2 text-2xl font-bold">92%</p>
                        <p className="text-xs text-primary-foreground/70">Percentil</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulacros Disponibles */}
              <section className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">
                    Simulacros Disponibles
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    {simulacros.filter(s => s.available).length} activos
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {simulacros.map((sim) => (
                    <Card
                      key={sim.id}
                      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                        !sim.available ? "opacity-60" : "hover:-translate-y-1"
                      }`}
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent" />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <Badge
                            variant={sim.available ? "default" : "secondary"}
                            className={sim.available ? "bg-primary" : ""}
                          >
                            {sim.available ? "Disponible" : "Próximamente"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {sim.difficulty}
                          </Badge>
                        </div>
                        <CardTitle className="mt-3 text-lg leading-tight">
                          {sim.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {sim.description}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 flex flex-wrap gap-1">
                          {sim.modules.slice(0, 3).map((mod) => (
                            <Badge
                              key={mod}
                              variant="secondary"
                              className="bg-muted text-xs font-normal"
                            >
                              {mod}
                            </Badge>
                          ))}
                          {sim.modules.length > 3 && (
                            <Badge
                              variant="secondary"
                              className="bg-muted text-xs font-normal"
                            >
                              +{sim.modules.length - 3}
                            </Badge>
                          )}
                        </div>

                        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Timer className="h-4 w-4" />
                            <span>{sim.duration} min</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4" />
                            <span>{sim.questions} preguntas</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{sim.deadline}</span>
                          </div>
                          <Button
                            size="sm"
                            disabled={!sim.available}
                            className={`${
                              sim.available
                                ? "bg-accent hover:bg-accent/90"
                                : ""
                            }`}
                          >
                            {sim.available ? (
                              <>
                                <Play className="mr-1.5 h-3.5 w-3.5" />
                                Iniciar
                              </>
                            ) : (
                              <>
                                <Lock className="mr-1.5 h-3.5 w-3.5" />
                                Bloqueado
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Mis Resultados */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  <h2 className="text-xl font-bold text-foreground">
                    Mis Resultados
                  </h2>
                </div>

                {resultados.length > 0 ? (
                  <div className="space-y-4">
                    {resultados.map((result) => (
                      <Card key={result.id} className="overflow-hidden">
                        <div className="flex flex-col lg:flex-row">
                          {/* Score Summary */}
                          <div className="flex items-center gap-6 border-b border-border bg-muted/30 p-6 lg:w-80 lg:border-b-0 lg:border-r">
                            <div className="relative">
                              <svg className="h-24 w-24 -rotate-90">
                                <circle
                                  cx="48"
                                  cy="48"
                                  r="40"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="8"
                                  className="text-muted"
                                />
                                <circle
                                  cx="48"
                                  cy="48"
                                  r="40"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="8"
                                  strokeDasharray={`${(result.score / result.maxScore) * 251.2} 251.2`}
                                  className="text-primary"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold">{result.score}</span>
                                <span className="text-xs text-muted-foreground">/{result.maxScore}</span>
                              </div>
                            </div>
                            <div>
                              <p className="font-semibold">{result.title}</p>
                              <p className="text-sm text-muted-foreground">{result.date}</p>
                              <div className="mt-2 flex items-center gap-1.5">
                                <Award className="h-4 w-4 text-accent" />
                                <span className="text-sm font-medium text-accent">
                                  Top {100 - result.percentile}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Module Breakdown */}
                          <div className="flex-1 p-6">
                            <div className="mb-3 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Desglose por Módulo
                              </p>
                            </div>
                            <div className="space-y-3">
                              {result.modules.map((mod) => (
                                <div key={mod.name} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{mod.name}</span>
                                    <span className="text-muted-foreground">
                                      {mod.score} pts • Percentil {mod.percentile}
                                    </span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                                      style={{ width: `${mod.percentile}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <Button variant="outline" size="sm" className="mt-4">
                              Ver Análisis Completo
                              <ChevronRight className="ml-1.5 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Trophy className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="mb-1 text-lg font-semibold">Sin resultados aún</h3>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Aún no tienes intentos finalizados. Completa un simulacro
                        para ver tu historial y análisis de rendimiento.
                      </p>
                      <Button className="mt-4 bg-accent hover:bg-accent/90">
                        <Play className="mr-2 h-4 w-4" />
                        Comenzar Ahora
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
