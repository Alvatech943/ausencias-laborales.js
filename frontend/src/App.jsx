import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/LoginForm";
import FormSolicitud from "./components/FormSolicitud";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";      // ← nuevo
import MisSolicitudes from "./page/MisSolicitudes";
import DetalleSolicitud from "./components/DetalleSolicitud";
import TableroSolicitudes from "./components/TableroSolicitudes";
import AdminDashboard from "./components/AdminDashboard";
import Layout from "./components/Layout";

export default function App() {
  const token = localStorage.getItem("token");

  return (
    <Router>
      <Routes>
        {/* Raíz */}
        <Route path="/" element={token ? <Navigate to="/mis-solicitudes" /> : <Navigate to="/login" />} />

        {/* Pública */}
        <Route path="/login" element={<LoginForm />} />

        {/* Privadas bajo Layout (usa Outlet) */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="mis-solicitudes" element={<MisSolicitudes />} />
          <Route path="solicitud" element={<FormSolicitud />} />
          <Route path="solicitudes/:id" element={<DetalleSolicitud mode="view" />} />
          <Route path="solicitudes/:id/aprobar-jefe" element={<DetalleSolicitud mode="jefe" />} />
          <Route path="solicitudes/:id/aprobar-secretario" element={<DetalleSolicitud mode="secretario" />} />
          <Route path="tablero" element={<TableroSolicitudes />} />

          {/* Admin dentro del Outlet */}
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
