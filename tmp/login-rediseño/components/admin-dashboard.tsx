"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  User,
  ClipboardList,
  FileQuestion,
  Settings,
  FileText,
  Users,
  LogOut,
  Bell,
  Search,
  Menu,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  MoreHorizontal,
  GraduationCap,
  BookOpen,
  Calculator,
  Globe,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: User, label: "Mi Perfil", active: false },
  { icon: ClipboardList, label: "Evaluaciones", active: false },
  { icon: FileQuestion, label: "Banco de Preguntas", active: false },
  { icon: Settings, label: "Especificaciones", active: false },
  { icon: FileText, label: "Simulacros", active: false },
  { icon: Users, label: "Usuarios", active: false },
]

const programData = [
  { name: "Ingeniería de Software", students: 45, completed: 38, percentage: 84 },
  { name: "Licenciatura en Matemáticas", students: 32, completed: 28, percentage: 87 },
  { name: "Ingeniería Electrónica", students: 28, completed: 22, percentage: 78 },
  { name: "Contaduría Pública", students: 56, completed: 41, percentage: 73 },
  { name: "Derecho", students: 67, completed: 52, percentage: 77 },
]

const criticalQuestions = [
  {
    id: 1,
    question: "¿Cuál de las siguientes gráficas corresponde a la del coseno?",
    module: "Razonamiento Cuantitativo",
    answered: 156,
    incorrect: 142,
    errorRate: 91.0,
  },
  {
    id: 2,
    question: "Identifique la estructura argumentativa del texto anterior.",
    module: "Lectura Crítica",
    answered: 189,
    incorrect: 134,
    errorRate: 70.9,
  },
  {
    id: 3,
    question: "¿Cuál es el valor de x en la ecuación cuadrática?",
    module: "Razonamiento Cuantitativo",
    answered: 203,
    incorrect: 127,
    errorRate: 62.6,
  },
  {
    id: 4,
    question: "Select the correct form of the verb in past participle.",
    module: "Inglés",
    answered: 178,
    incorrect: 98,
    errorRate: 55.1,
  },
  {
    id: 5,
    question: "¿Qué derecho fundamental se vulnera en el caso expuesto?",
    module: "Competencias Ciudadanas",
    answered: 145,
    incorrect: 67,
    errorRate: 46.2,
  },
]

const recentActivity = [
  { user: "María García", action: "Completó simulacro", time: "Hace 5 min", type: "success" },
  { user: "Juan Rodríguez", action: "Inició evaluación", time: "Hace 12 min", type: "info" },
  { user: "Ana Martínez", action: "Abandonó simulacro", time: "Hace 23 min", type: "warning" },
  { user: "Carlos López", action: "Completó simulacro", time: "Hace 45 min", type: "success" },
]

const moduleStats = [
  { name: "Lectura Crítica", icon: BookOpen, avg: 185, trend: +3.2, color: "bg-blue-500" },
  { name: "Razonamiento Cuantitativo", icon: Calculator, avg: 171, trend: -1.5, color: "bg-amber-500" },
  { name: "Competencias Ciudadanas", icon: Users, avg: 207, trend: +5.1, color: "bg-emerald-500" },
  { name: "Inglés", icon: Globe, avg: 193, trend: +2.8, color: "bg-purple-500" },
  { name: "Comunicación Escrita", icon: MessageSquare, avg: 196, trend: +1.2, color: "bg-rose-500" },
]

export function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-sidebar-foreground/60">SABER PRO</span>
              <span className="text-lg font-bold text-primary">USCO</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                item.active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.active && <ChevronRight className="h-4 w-4" />}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
          {sidebarOpen && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-sidebar-accent/30 px-3 py-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs text-sidebar-foreground/60">ÁREA SEGURA</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="h-10 w-80 rounded-lg border border-input bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                3
              </span>
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">ADMINISTRADOR</p>
                <p className="text-sm font-semibold text-foreground">OSCAR E PERDOMO S</p>
              </div>
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                  OE
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary">
              Inteligencia Académica - Saber Pro
            </h1>
            <p className="mt-1 text-muted-foreground">
              Panel de administración y análisis de resultados
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Main KPI Card */}
            <Card className="overflow-hidden bg-accent text-accent-foreground lg:row-span-2">
              <CardContent className="flex h-full flex-col justify-between p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground/80">
                    Indicador Principal
                  </p>
                  <p className="mt-4 text-6xl font-bold">248</p>
                  <p className="mt-2 text-sm text-accent-foreground/80">
                    Evaluaciones Completadas
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">+18% vs mes anterior</span>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estudiantes Activos</p>
                    <p className="text-3xl font-bold text-foreground">1,247</p>
                    <p className="mt-1 flex items-center text-xs text-primary">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      +24 esta semana
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Simulacros Activos</p>
                    <p className="text-3xl font-bold text-foreground">12</p>
                    <p className="mt-1 flex items-center text-xs text-emerald-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      3 por vencer
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                    <FileText className="h-6 w-6 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Preguntas en Banco</p>
                    <p className="text-3xl font-bold text-foreground">856</p>
                    <p className="mt-1 flex items-center text-xs text-amber-600">
                      <BookOpen className="mr-1 h-3 w-3" />
                      5 módulos
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                    <FileQuestion className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Puntaje Promedio</p>
                    <p className="text-3xl font-bold text-foreground">187</p>
                    <p className="mt-1 flex items-center text-xs text-blue-600">
                      <BarChart3 className="mr-1 h-3 w-3" />
                      de 300 posibles
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="mb-6 grid gap-6 lg:grid-cols-5">
            {/* Participation by Program */}
            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold text-primary">
                  Participación por Programa
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Ver todos
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {programData.map((program, index) => (
                    <div key={index} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <GraduationCap className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{program.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {program.completed} de {program.students} estudiantes
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="secondary" 
                            className={`${
                              program.percentage >= 80 
                                ? "bg-emerald-100 text-emerald-700" 
                                : program.percentage >= 70 
                                ? "bg-amber-100 text-amber-700" 
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {program.percentage}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${
                            program.percentage >= 80 
                              ? "bg-emerald-500" 
                              : program.percentage >= 70 
                              ? "bg-amber-500" 
                              : "bg-red-500"
                          }`}
                          style={{ width: `${program.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-primary">
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                        activity.type === "success" 
                          ? "bg-emerald-100" 
                          : activity.type === "warning" 
                          ? "bg-amber-100" 
                          : "bg-blue-100"
                      }`}>
                        {activity.type === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : activity.type === "warning" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{activity.user}</p>
                        <p className="text-xs text-muted-foreground">{activity.action}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Module Performance */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-primary">
                Rendimiento por Módulo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {moduleStats.map((module, index) => (
                  <div
                    key={index}
                    className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${module.color}/10`}>
                        <module.icon className={`h-5 w-5 ${module.color.replace("bg-", "text-")}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground line-clamp-1">{module.name}</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{module.avg}</p>
                        <p className="text-xs text-muted-foreground">Promedio</p>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        module.trend > 0 ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {module.trend > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(module.trend)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Critical Questions Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold text-primary">
                  Top Preguntas Críticas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Preguntas con mayor tasa de error
                </p>
              </div>
              <Button variant="outline" size="sm">
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Enunciado de la Pregunta</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead className="text-center">Veces Respondida</TableHead>
                    <TableHead className="text-center">Veces Incorrecta</TableHead>
                    <TableHead className="text-right">Tasa de Error</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalQuestions.map((question) => (
                    <TableRow key={question.id} className="group">
                      <TableCell className="font-medium">
                        <p className="line-clamp-1">{question.question}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {question.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{question.answered}</TableCell>
                      <TableCell className="text-center">{question.incorrect}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${
                          question.errorRate >= 70 
                            ? "text-red-600" 
                            : question.errorRate >= 50 
                            ? "text-amber-600" 
                            : "text-foreground"
                        }`}>
                          {question.errorRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                            <DropdownMenuItem>Editar pregunta</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              Desactivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
