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
  ChevronDown,
  GraduationCap,
  Bell,
  Search,
  Menu,
  Lock,
  Mail,
  IdCard,
  BookOpen,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  { icon: LayoutDashboard, label: "Dashboard", active: false },
  { icon: User, label: "Mi Perfil", active: true },
  { icon: ClipboardList, label: "Evaluaciones", active: false },
  { icon: FileQuestion, label: "Banco de Preguntas", active: false },
  { icon: Settings, label: "Especificaciones", active: false },
  { icon: FileText, label: "Simulacros", active: false },
  { icon: Users, label: "Usuarios", active: false },
]

const userData = {
  nombre: "Paula Andrea Aldana Castañeda",
  correo: "u20221202987@usco.edu.co",
  documento: "CC 1004157139",
  programa: "Licenciatura en Matemáticas",
  iniciales: "PA",
}

export function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [passwordSectionOpen, setPasswordSectionOpen] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

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
                    <p className="text-sm font-medium">{userData.nombre}</p>
                    <p className="text-xs text-muted-foreground">Estudiante</p>
                  </div>
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                      {userData.iniciales}
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Mi Perfil
            </h1>
          </div>

          {/* Personal Information Card */}
          <Card className="mb-6 border-primary/20">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent/30">
                  <User className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-accent">Información Personal</h2>
                  <p className="text-sm text-muted-foreground">Estos datos son de solo lectura.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    Nombre
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{userData.nombre}</p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    Correo
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{userData.correo}</p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <IdCard className="h-3.5 w-3.5" />
                    Documento
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{userData.documento}</p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    Programa
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{userData.programa}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Section - Glassmorphic Collapsible */}
          <div className="relative">
            {/* Glassmorphic Background Effect */}
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 blur-xl" />
            
            <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/70 shadow-xl backdrop-blur-xl dark:bg-black/30">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
              
              {/* Header - Clickable */}
              <button
                onClick={() => setPasswordSectionOpen(!passwordSectionOpen)}
                className="relative flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-white/50 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/70 shadow-lg shadow-accent/20">
                    <Shield className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-accent">Cambiar Contraseña</h2>
                    <p className="text-sm text-muted-foreground">Actualiza tu contraseña de acceso</p>
                  </div>
                </div>
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 transition-transform duration-300",
                  passwordSectionOpen && "rotate-180"
                )}>
                  <ChevronDown className="h-5 w-5 text-accent" />
                </div>
              </button>

              {/* Collapsible Content */}
              <div
                className={cn(
                  "relative grid transition-all duration-300 ease-in-out",
                  passwordSectionOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-white/20 p-6 pt-6">
                    <div className="space-y-5">
                      {/* New Password Field */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          Contraseña Nueva
                        </label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Ingresa la nueva contraseña"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="h-12 border-white/30 bg-white/50 pr-12 backdrop-blur-sm transition-all focus:border-primary focus:bg-white dark:bg-black/20 dark:focus:bg-black/30"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password Field */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          Confirmar Contraseña
                        </label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirma la nueva contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-12 border-white/30 bg-white/50 pr-12 backdrop-blur-sm transition-all focus:border-primary focus:bg-white dark:bg-black/20 dark:focus:bg-black/30"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Password Requirements */}
                      <div className="rounded-lg bg-primary/5 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                          Requisitos de contraseña
                        </p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              newPassword.length >= 8 ? "bg-primary" : "bg-muted-foreground/30"
                            )} />
                            Mínimo 8 caracteres
                          </li>
                          <li className="flex items-center gap-2">
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              /[A-Z]/.test(newPassword) ? "bg-primary" : "bg-muted-foreground/30"
                            )} />
                            Al menos una mayúscula
                          </li>
                          <li className="flex items-center gap-2">
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              /[0-9]/.test(newPassword) ? "bg-primary" : "bg-muted-foreground/30"
                            )} />
                            Al menos un número
                          </li>
                        </ul>
                      </div>

                      {/* Submit Button */}
                      <Button
                        className="h-12 w-full bg-gradient-to-r from-accent to-accent/80 font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:shadow-accent/30"
                        disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
                      >
                        Actualizar Contraseña
                      </Button>

                      {/* Password Match Indicator */}
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-center text-sm text-destructive">
                          Las contraseñas no coinciden
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
