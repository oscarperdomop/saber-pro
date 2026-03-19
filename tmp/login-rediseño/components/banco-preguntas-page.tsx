"use client"

import { useState } from "react"
import {
  Search,
  Plus,
  LayoutDashboard,
  User,
  ClipboardList,
  FileQuestion,
  Settings2,
  FileText,
  Users,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calculator,
  MessageSquare,
  Globe,
  Users2,
  Filter,
  SortAsc,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: User, label: "Mi Perfil", href: "/perfil" },
  { icon: ClipboardList, label: "Evaluaciones", href: "/evaluaciones" },
  { icon: FileQuestion, label: "Banco de Preguntas", href: "/preguntas", active: true },
  { icon: Settings2, label: "Especificaciones", href: "/especificaciones" },
  { icon: FileText, label: "Simulacros", href: "/simulacros" },
  { icon: Users, label: "Usuarios", href: "/usuarios" },
]

const moduleData = [
  {
    id: 1,
    name: "Lectura Crítica",
    icon: BookOpen,
    color: "from-emerald-500 to-emerald-600",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    totalQuestions: 24,
    difficulty: { easy: 8, medium: 12, hard: 4 },
    lastUpdated: "Hace 2 días",
  },
  {
    id: 2,
    name: "Razonamiento Cuantitativo",
    icon: Calculator,
    color: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    totalQuestions: 18,
    difficulty: { easy: 5, medium: 8, hard: 5 },
    lastUpdated: "Hace 1 día",
  },
  {
    id: 3,
    name: "Competencias Ciudadanas",
    icon: Users2,
    color: "from-amber-500 to-amber-600",
    bgLight: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    totalQuestions: 15,
    difficulty: { easy: 6, medium: 7, hard: 2 },
    lastUpdated: "Hace 3 días",
  },
  {
    id: 4,
    name: "Comunicación Escrita",
    icon: MessageSquare,
    color: "from-purple-500 to-purple-600",
    bgLight: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
    totalQuestions: 12,
    difficulty: { easy: 4, medium: 5, hard: 3 },
    lastUpdated: "Hace 5 días",
  },
  {
    id: 5,
    name: "Inglés",
    icon: Globe,
    color: "from-rose-500 to-rose-600",
    bgLight: "bg-rose-50",
    textColor: "text-rose-700",
    borderColor: "border-rose-200",
    totalQuestions: 20,
    difficulty: { easy: 7, medium: 9, hard: 4 },
    lastUpdated: "Hace 1 semana",
  },
]

const recentQuestions = [
  {
    id: 1,
    text: "¿Cuál de las siguientes gráficas corresponde a la del coseno?",
    module: "Razonamiento Cuantitativo",
    difficulty: "Media",
    createdAt: "15 Mar 2026",
  },
  {
    id: 2,
    text: "Según el texto, ¿cuál es la idea principal del autor?",
    module: "Lectura Crítica",
    difficulty: "Fácil",
    createdAt: "14 Mar 2026",
  },
  {
    id: 3,
    text: "What is the main purpose of the passage?",
    module: "Inglés",
    difficulty: "Media",
    createdAt: "13 Mar 2026",
  },
]

export function BancoPreguntasPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewQuestionOpen, setIsNewQuestionOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  const totalQuestions = moduleData.reduce((acc, m) => acc + m.totalQuestions, 0)

  const filteredModules = selectedModule
    ? moduleData.filter((m) => m.name === selectedModule)
    : moduleData

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? "w-16" : "w-64"
        } flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <span className="text-sm font-bold text-accent-foreground">SP</span>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Saber Pro
                </p>
                <p className="text-lg font-bold leading-none text-primary">USCO</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <span className="text-sm font-bold text-accent-foreground">SP</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                item.active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.active && (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <a
            href="/logout"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>Cerrar Sesión</span>}
          </a>
          {!sidebarCollapsed && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/50">
              <Lock className="h-3 w-3" />
              <span>Área Segura</span>
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
              className="text-muted-foreground"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="w-64 pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
                3
              </span>
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Usuario</p>
                <p className="text-sm font-medium">Oscar E Perdomo S</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-accent">
                <AvatarFallback className="bg-accent text-accent-foreground font-semibold text-sm">
                  OE
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Banco de Preguntas</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Gestiona las preguntas por módulo de competencia
              </p>
            </div>
            <Dialog open={isNewQuestionOpen} onOpenChange={setIsNewQuestionOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Pregunta
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Pregunta</DialogTitle>
                  <DialogDescription>
                    Agrega una nueva pregunta al banco de preguntas
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="module">Módulo</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {moduleData.map((m) => (
                          <SelectItem key={m.id} value={m.name}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="difficulty">Dificultad</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar dificultad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Fácil</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="hard">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="question">Enunciado</Label>
                    <Textarea
                      id="question"
                      placeholder="Escribe el enunciado de la pregunta..."
                      className="min-h-24"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsNewQuestionOpen(false)}>
                    Cancelar
                  </Button>
                  <Button className="bg-primary hover:bg-primary/90">
                    Crear Pregunta
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Summary */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Preguntas</p>
                <p className="text-2xl font-bold text-foreground">{totalQuestions}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Fáciles</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {moduleData.reduce((acc, m) => acc + m.difficulty.easy, 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Medias</p>
                <p className="text-2xl font-bold text-amber-600">
                  {moduleData.reduce((acc, m) => acc + m.difficulty.medium, 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-rose-500">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Difíciles</p>
                <p className="text-2xl font-bold text-rose-600">
                  {moduleData.reduce((acc, m) => acc + m.difficulty.hard, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por enunciado..."
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {selectedModule || "Todos los módulos"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedModule(null)}>
                  Todos los módulos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {moduleData.map((m) => (
                  <DropdownMenuItem key={m.id} onClick={() => setSelectedModule(m.name)}>
                    {m.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" className="gap-2">
              <SortAsc className="h-4 w-4" />
              Ordenar
            </Button>
          </div>

          {/* Module Cards Grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModules.map((module) => (
              <Card
                key={module.id}
                className={`group overflow-hidden border transition-all hover:shadow-lg hover:-translate-y-1 ${module.borderColor}`}
              >
                <div className={`h-1.5 bg-gradient-to-r ${module.color}`} />
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className={`rounded-xl p-3 ${module.bgLight}`}>
                      <module.icon className={`h-6 w-6 ${module.textColor}`} />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver preguntas
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar módulo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className={`text-lg font-semibold ${module.textColor}`}>
                    {module.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Total de preguntas: <span className="font-semibold text-foreground">{module.totalQuestions}</span>
                  </p>

                  {/* Difficulty Distribution */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      Fácil: {module.difficulty.easy}
                    </Badge>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                      Media: {module.difficulty.medium}
                    </Badge>
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                      Alta: {module.difficulty.hard}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{ width: `${(module.difficulty.easy / module.totalQuestions) * 100}%` }}
                      />
                      <div
                        className="bg-amber-500 transition-all"
                        style={{ width: `${(module.difficulty.medium / module.totalQuestions) * 100}%` }}
                      />
                      <div
                        className="bg-rose-500 transition-all"
                        style={{ width: `${(module.difficulty.hard / module.totalQuestions) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{module.lastUpdated}</span>
                    <Button className={`bg-gradient-to-r ${module.color} text-white hover:opacity-90`}>
                      Ver Preguntas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Questions Table */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b border-border p-4">
                <h3 className="font-semibold text-foreground">Preguntas Recientes</h3>
                <p className="text-sm text-muted-foreground">Últimas preguntas agregadas al banco</p>
              </div>
              <div className="divide-y divide-border">
                {recentQuestions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{q.text}</p>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{q.module}</span>
                        <Badge
                          variant="outline"
                          className={
                            q.difficulty === "Fácil"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : q.difficulty === "Media"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }
                        >
                          {q.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">{q.createdAt}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
