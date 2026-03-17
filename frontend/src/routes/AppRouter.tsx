import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AdminRoute from '../components/layout/AdminRoute'
import MainLayout from '../components/layout/MainLayout'
import ProtectedRoute from '../components/layout/ProtectedRoute'
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
import DashboardPage from '../features/dashboard/pages/DashboardPage'
import EvaluacionesPage from '../features/evaluaciones/pages/EvaluacionesPage'
import ModulosIntentoPage from '../features/evaluaciones/pages/ModulosIntentoPage'
import PresentarExamenPage from '../features/evaluaciones/pages/PresentarExamenPage'
import ResultadosExamenPage from '../features/evaluaciones/pages/ResultadosExamenPage'

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/activar-cuenta" element={<ActivarCuentaPage />} />
          <Route
            path="/evaluaciones/intento/:intentoId/modulo/:moduloId"
            element={<PresentarExamenPage />}
          />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/evaluaciones" element={<EvaluacionesPage />} />
            <Route path="/evaluaciones/intento/:intentoId" element={<ModulosIntentoPage />} />
            <Route
              path="/evaluaciones/intento/:intentoId/resultados"
              element={<ResultadosExamenPage />}
            />
            <Route element={<AdminRoute />}>
              <Route path="/preguntas" element={<BancoPreguntasPage />} />
              <Route path="/preguntas/nueva" element={<CrearPreguntaPage />} />
              <Route path="/preguntas/:preguntaId/editar" element={<EditarPreguntaPage />} />
              <Route path="/preguntas/modulo/:moduloNombre" element={<PreguntasModuloPage />} />
              <Route path="/modulos/especificaciones" element={<EspecificacionesModuloPage />} />
              <Route path="/simulacros" element={<SimulacrosPage />} />
              <Route path="/simulacros/nuevo" element={<CrearSimulacroPage />} />
              <Route path="/simulacros/editar/:id" element={<EditarSimulacroPage />} />
              <Route path="/simulacros/:id/resultados" element={<ResultadosSimulacroPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
