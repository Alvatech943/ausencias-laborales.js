import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function MisSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [rol, setRol] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const userRol = localStorage.getItem("rol") || "";
        setRol(userRol);
        // El backend ya decide qué ver según jerarquía; no hace falta query extra
        const { data } = await api.get("/solicitudes/mis-solicitudes");
        setSolicitudes(data);
      } catch (error) {
        console.error("Error cargando solicitudes:", error);
      }
    })();
  }, []);

  const getEstadoColor = (estado) => {
    switch (estado) {
      case "pendiente_jefe":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "pendiente_secretario":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "aprobada":
        return "bg-green-100 text-green-800 border-green-300";
      case "rechazada":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const irADetalle = (s) => {
    const userRol = (rol || "").toUpperCase();
    if (userRol.startsWith("JEFE")) {
      navigate(`/solicitudes/${s.id}/aprobar-jefe`);
    } else if (userRol === "SECRETARIO") {
      navigate(`/solicitudes/${s.id}/aprobar-secretario`);
    } else {
      navigate(`/solicitudes/${s.id}`);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        📋 {rol?.startsWith("JEFE") ? "Solicitudes de mi Área" : "Mis Solicitudes"}
      </h2>

      {solicitudes.length === 0 ? (
        <p className="text-gray-600">No hay solicitudes registradas.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {solicitudes.map((s) => {
            const titulo =
              (s.motivo && s.motivo.trim()) ||
              [
                s.estudios && "Estudios",
                s.cita_medica && "Cita Médica",
                s.licencia && "Licencia",
                s.compensatorio && "Compensatorio",
                s.otro && "Otro",
              ].filter(Boolean).join(", ");

            return (
              <div
                key={s.id}
                className="bg-white shadow rounded-xl p-4 border hover:shadow-lg transition cursor-pointer"
                onClick={() => irADetalle(s)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg text-gray-700">{titulo || `Solicitud #${s.id}`}</h3>
                  <span className={`px-3 py-1 text-sm rounded-full border ${getEstadoColor(s.estado)}`}>
                    {s.estado}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Área: <span className="font-medium">{s.area_trabajo || "—"}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Fecha de creación:{" "}
                  <span className="font-medium">
                    {s.fecha ? new Date(s.fecha).toLocaleDateString() : "—"}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
