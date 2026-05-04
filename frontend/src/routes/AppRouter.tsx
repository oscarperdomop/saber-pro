import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import RoleRoute from '../components/layout/RoleRoute'

const MainLayout = lazy(() => import('../components/layout/MainLayout'))
const BancoPreguntasPage = lazy(() => import('../features/admin/pages/BancoPreguntasPage'))
const CrearPreguntaPage = lazy(() => import('../features/admin/pages/CrearPreguntaPage'))
const CrearSimulacroPage = lazy(() => import('../features/admin/pages/CrearSimulacroPage'))
const EditarPreguntaPage = lazy(() => import('../features/admin/pages/EditarPreguntaPage'))
const EditarSimulacroPage = lazy(() => import('../features/admin/pages/EditarSimulacroPage'))
const EspecificacionesModuloPage = lazy(
  () => import('../features/admin/pages/EspecificacionesModuloPage'),
)
const PreguntasModuloPage = lazy(() => import('../features/admin/pages/PreguntasModuloPage'))
const PreguntaCarouselView = lazy(() => import('../features/admin/pages/PreguntaCarouselView'))
const ResultadosSimulacroPage = lazy(() => import('../features/admin/pages/ResultadosSimulacroPage'))
const SimulacrosPage = lazy(() => import('../features/admin/pages/SimulacrosPage'))
const UsuariosPage = lazy(() => import('../features/admin/pages/UsuariosPage'))
const ActivarCuentaPage = lazy(() => import('../features/auth/pages/ActivarCuentaPage'))
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'))
const MiPerfilPage = lazy(() => import('../features/auth/pages/MiPerfilPage'))
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'))
const EvaluacionesPage = lazy(() => import('../features/estudiante/pages/EvaluacionesPage'))
const ModulosIntentoPage = lazy(() => import('../features/estudiante/pages/ModulosIntentoPage'))
const PresentarExamenPage = lazy(() => import('../features/estudiante/pages/PresentarExamenPage'))
const ResultadosExamenPage = lazy(() => import('../features/estudiante/pages/ResultadosExamenPage'))
const ResultadosPage = lazy(() => import('../features/estudiante/pages/ResultadosPage'))

const RouteFallback = () => (
  <div className="mx-auto flex min-h-[40vh] w-full max-w-5xl items-center justify-center px-4">
    <p className="text-sm font-semibold text-usco-gris">Cargando vista...</p>
  </div>
)

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/activar-cuenta" element={<ActivarCuentaPage />} />

            <Route element={<RoleRoute allowedRoles={['ESTUDIANTE']} />}>
              <Route
                path="/evaluaciones/intento/:intentoId/modulo/:moduloId"
                element={<PresentarExamenPage />}
              />
            </Route>

            <Route element={<MainLayout />}>
              <Route path="/perfil" element={<MiPerfilPage />} />

              <Route
                element={
                  <RoleRoute
                    allowedRoles={['ADMIN', 'PROFESOR']}
                    requireStaffForRoles={['PROFESOR']}
                  />
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/preguntas" element={<BancoPreguntasPage />} />
                <Route path="/preguntas/nueva" element={<CrearPreguntaPage />} />
                <Route path="/preguntas/:preguntaId/editar" element={<EditarPreguntaPage />} />
                <Route path="/preguntas/carousel" element={<PreguntaCarouselView />} />
                <Route path="/preguntas/modulo/:moduloNombre" element={<PreguntasModuloPage />} />
                <Route path="/modulos/especificaciones" element={<EspecificacionesModuloPage />} />
                <Route path="/simulacros" element={<SimulacrosPage />} />
                <Route path="/simulacros/nuevo" element={<CrearSimulacroPage />} />
                <Route path="/simulacros/editar/:id" element={<EditarSimulacroPage />} />
                <Route path="/simulacros/:id/resultados" element={<ResultadosSimulacroPage />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
                <Route path="/usuarios" element={<UsuariosPage />} />
              </Route>

              <Route
                element={
                  <RoleRoute
                    allowedRoles={['ESTUDIANTE', 'PROFESOR']}
                    denyStaffForRoles={['PROFESOR']}
                  />
                }
              >
                <Route path="/estudiante/dashboard" element={<DashboardPage />} />
                <Route path="/evaluaciones" element={<EvaluacionesPage />} />
                <Route path="/resultados" element={<ResultadosPage />} />
                <Route path="/evaluaciones/intento/:intentoId" element={<ModulosIntentoPage />} />
                <Route
                  path="/evaluaciones/intento/:intentoId/resultados"
                  element={<ResultadosExamenPage />}
                />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default AppRouter
