import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const rol = (localStorage.getItem("rol") || "").toLowerCase();

  if (!token) return <Navigate to="/login" replace />;
  if (rol !== "admin") return <Navigate to="/mis-solicitudes" replace />;

  return children;
}
