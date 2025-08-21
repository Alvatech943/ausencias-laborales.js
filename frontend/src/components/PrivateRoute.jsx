// src/components/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('token'); // síncrono
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
