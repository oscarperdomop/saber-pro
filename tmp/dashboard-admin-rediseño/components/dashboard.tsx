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
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  BarChart3,
  Bell,
  Search,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: User, label: "Mi Perfil", active: false },
  { icon: ClipboardList, label: "Evaluaciones", active: false },
  { icon: FileQuestion, label: "Banco de Preguntas", active: false },
  { icon: Settings, label: "Especificaciones", active: false },
  { icon: FileText, label: "Simulacros", active: false },
  { icon: Users, label: "Usuarios", active: false },
]

const programas = [
  { nombre: "Ingeniería de Software", participantes: 45, tendencia: "up", cambio: 12 },
  { nombre: "Licenciatura en Matemáticas", participantes: 38, tendencia: "up", cambio: 8 },
  { nombre: "Ingeniería Electrónica", participantes: 32, tendencia: "down", cambio: 3 },
  { nombre: "Contaduría Pública", participantes: 28, tendencia: "up", cambio: 5 },
]

const preguntasCriticas = [
  {
    enunciado: "¿Cuál de las siguientes gráficas corresponde a la del coseno?",
    vecesRespondida: 156,
    vecesIncorrecta: 98,
    tasaError: 62.8,
  },
  {
    enunciado: "¿Cuál es el valor de la integral definida de x² entre 0 y 2?",
    vecesRespondida: 142,
    vecesIncorrecta: 71,
    tasaError: 50.0,
  },
  {
    enunciado: "Identifique la estructura gramatical correcta en la oración...",
    vecesRespondida: 128,
    vecesIncorrecta: 52,
    tasaError: 40.6,
  },
  {
    enunciado: "¿Cuál es la capital de Colombia?",
    vecesRespondida: 200,
    vecesIncorrecta: 4,
    tasaError: 2.0,
  },
]

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 lg:relative",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-sidebar-foreground/60">SABER PRO</span>
              <span className="text-lg font-bold tracking-tight text-primary">USCO</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                item.active
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", item.active && "text-primary")} />
              {sidebarOpen && <span>{item.label}</span>}
              {item.active && sidebarOpen && (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border p-3">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
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
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:flex"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="w-64 bg-muted/50 pl-9 focus:bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                3
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 px-2">
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-medium">Oscar E. Perdomo S.</p>
                    <p className="text-xs text-muted-foreground">Administrador</p>
                  </div>
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      OE
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Inteligencia Académica
            </h1>
            <p className="text-muted-foreground">
              Panel de control - Saber Pro
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Indicador Principal - Borgoña USCO */}
            <Card className="overflow-hidden bg-accent text-accent-foreground">
              <CardContent className="p-5">
                <div className="flex flex-col">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground/80">
                    Indicador Principal
                  </p>
                  <p className="mt-2 text-5xl font-bold">2</p>
                  <p className="mt-1 text-sm text-accent-foreground/80">
                    Evaluaciones Completadas
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Evaluaciones</p>
                    <p className="text-3xl font-bold text-foreground">24</p>
                    <p className="mt-1 flex items-center text-xs text-primary">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      +12% este mes
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-accent">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completadas</p>
                    <p className="text-3xl font-bold text-foreground">18</p>
                    <p className="mt-1 flex items-center text-xs text-accent">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      75% tasa de finalización
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                    <CheckCircle2 className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-chart-3">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Preguntas</p>
                    <p className="text-3xl font-bold text-foreground">1,248</p>
                    <p className="mt-1 flex items-center text-xs text-chart-3">
                      <BookOpen className="mr-1 h-3 w-3" />
                      32 nuevas esta semana
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-3/10">
                    <FileQuestion className="h-6 w-6 text-chart-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-chart-4">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Usuarios Activos</p>
                    <p className="text-3xl font-bold text-foreground">143</p>
                    <p className="mt-1 flex items-center text-xs text-chart-4">
                      <Users className="mr-1 h-3 w-3" />
                      12 en línea ahora
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-4/10">
                    <Users className="h-6 w-6 text-chart-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Grid */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Participación por Programa */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Participación por Programa</CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    4 programas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {programas.map((programa) => (
                  <div
                    key={programa.nombre}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{programa.nombre}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress
                          value={(programa.participantes / 50) * 100}
                          className="h-2 w-32"
                        />
                        <span className="text-sm text-muted-foreground">
                          {programa.participantes} estudiantes
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {programa.tendencia === "up" ? (
                        <span className="flex items-center text-sm font-medium text-primary">
                          <TrendingUp className="mr-1 h-4 w-4" />
                          +{programa.cambio}%
                        </span>
                      ) : (
                        <span className="flex items-center text-sm font-medium text-destructive">
                          <TrendingDown className="mr-1 h-4 w-4" />
                          -{programa.cambio}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Rendimiento General */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Rendimiento General</CardTitle>
                  <Badge variant="outline" className="font-normal">
                    Último mes
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <BarChart3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Promedio General</p>
                        <p className="text-2xl font-bold text-foreground">185.4</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-primary">+8.2%</p>
                      <p className="text-xs text-muted-foreground">vs. mes anterior</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">Comunicación Escrita</p>
                      <p className="mt-1 text-xl font-bold">185</p>
                      <Progress value={61.7} className="mt-2 h-1.5" />
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">Razonamiento Cuantitativo</p>
                      <p className="mt-1 text-xl font-bold">171</p>
                      <Progress value={57} className="mt-2 h-1.5" />
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">Lectura Crítica</p>
                      <p className="mt-1 text-xl font-bold">196</p>
                      <Progress value={65.3} className="mt-2 h-1.5" />
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">Competencias Ciudadanas</p>
                      <p className="mt-1 text-xl font-bold">207</p>
                      <Progress value={69} className="mt-2 h-1.5" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Preguntas Críticas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Preguntas con mayor tasa de error
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Ver todas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Enunciado de la Pregunta</TableHead>
                    <TableHead className="text-center font-semibold">Respondidas</TableHead>
                    <TableHead className="text-center font-semibold">Incorrectas</TableHead>
                    <TableHead className="text-right font-semibold">Tasa de Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preguntasCriticas.map((pregunta, index) => (
                    <TableRow key={index} className="group">
                      <TableCell className="max-w-md">
                        <p className="truncate font-medium text-foreground">
                          {pregunta.enunciado}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{pregunta.vecesRespondida}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-muted-foreground">
                          {pregunta.vecesIncorrecta}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={pregunta.tasaError > 50 ? "destructive" : pregunta.tasaError > 30 ? "secondary" : "outline"}
                          className={cn(
                            "font-semibold",
                            pregunta.tasaError <= 10 && "border-primary/30 bg-primary/10 text-primary"
                          )}
                        >
                          {pregunta.tasaError.toFixed(1)}%
                        </Badge>
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
