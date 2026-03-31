import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import RoleRoute from '../components/layout/RoleRoute'
import BancoPreguntasPage from '../features/admin/pages/BancoPreguntasPage'
import CrearPreguntaPage from '../features/admin/pages/CrearPreguntaPage'
import CrearSimulacroPage from '../features/admin/pages/CrearSimulacroPage'
import EditarPreguntaPage from '../features/admin/pages/EditarPreguntaPage'
import EditarSimulacroPage from '../features/admin/pages/EditarSimulacroPage'
import EspecificacionesModuloPage from '../features/admin/pages/EspecificacionesModuloPage'
import PreguntasModuloPage from '../features/admin/pages/PreguntasModuloPage'
import ResultadosSimulacroPage from '../features/admin/pages/ResultadosSimulacroPage'
import SimulacrosPage from '../features/admin/pages/SimulacrosPage'
import UsuariosPage from '../features/admin/pages/UsuariosPage'
import ActivarCuentaPage from '../features/auth/pages/ActivarCuentaPage'
import LoginPage from '../features/auth/pages/LoginPage'
import MiPerfilPage from '../features/auth/pages/MiPerfilPage'
import DashboardPage from '../features/dashboard/pages/DashboardPage'
import EvaluacionesPage from '../features/estudiante/pages/EvaluacionesPage'
import ModulosIntentoPage from '../features/estudiante/pages/ModulosIntentoPage'
import PresentarExamenPage from '../features/estudiante/pages/PresentarExamenPage'
import ResultadosExamenPage from '../features/estudiante/pages/ResultadosExamenPage'

const AppRouter = () => {
  return (
    <BrowserRouter>
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
              <Route path="/evaluaciones/intento/:intentoId" element={<ModulosIntentoPage />} />
              <Route
                path="/evaluaciones/intento/:intentoId/resultados"
                element={<ResultadosExamenPage />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
