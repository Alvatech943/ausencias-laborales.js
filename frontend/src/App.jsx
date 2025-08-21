import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/LoginForm";
import FormSolicitud from "./components/FormSolicitud";
import PrivateRoute from "./components/PrivateRoute";
import MisSolicitudes from "./page/MisSolicitudes";
import Layout from "./components/Layout";

function App() {
  const token = localStorage.getItem("token");

  return (
    <Router>
      <Routes>
        {/* Ruta raíz redirige según si hay token */}
        <Route
          path="/"
          element={token ? <Navigate to="/solicitud" /> : <Navigate to="/login" />}
        />

        {/* Login */}
        <Route path="/login" element={<LoginForm />} />

        {/* Rutas privadas con Layout */}
        <Route
          path="/solicitud"
          element={
            <PrivateRoute>
              <Layout>
                <FormSolicitud />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-solicitudes"
          element={
            <PrivateRoute>
              <Layout>
                <MisSolicitudes />
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
