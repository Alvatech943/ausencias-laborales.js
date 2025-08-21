// import { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import axios from "axios";

// export default function DetalleSolicitud() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [solicitud, setSolicitud] = useState(null);
//   const [rol, setRol] = useState("");
//   const [firma, setFirma] = useState("");

//   useEffect(() => {
//     const fetchSolicitud = async () => {
//       const token = localStorage.getItem("token");
//       const userRol = localStorage.getItem("rol");
//       setRol(userRol);

//       try {
//         const { data } = await axios.get(
//           `http://localhost:4000/api/solicitudes/${id}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setSolicitud(data);
//       } catch (error) {
//         console.error(error);
//       }
//     };
//     fetchSolicitud();
//   }, [id]);

//   if (!solicitud) return <p>Cargando...</p>;

//   const handleAprobar = async () => {
//     const token = localStorage.getItem("token");
//     try {
//       await axios.patch(
//         `http://localhost:4000/api/solicitudes/${id}/aprobar`,
//         {},
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       alert("✅ Solicitud enviada al Secretario");
//       navigate("/mis-solicitudes");
//     } catch (error) {
//       console.error(error);
//       alert("❌ Error al aprobar la solicitud");
//     }
//   };

//   const handleFirmar = async () => {
//     const token = localStorage.getItem("token");
//     try {
//       await axios.patch(
//         `http://localhost:4000/api/solicitudes/${id}/firmar`,
//         { firma: firma || rol }, // Firma puede ser nombre del usuario o rol
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       alert("✅ Firmado correctamente");
//       // Recargar datos
//       const { data } = await axios.get(
//         `http://localhost:4000/api/solicitudes/${id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setSolicitud(data);
//       setFirma("");
//     } catch (error) {
//       console.error(error);
//       alert("❌ Error al firmar");
//     }
//   };

//   // Construir título automático si no hay motivo
//   const titulo =
//     solicitud.motivo?.trim() ||
//     [
//       solicitud.estudios && "Estudios",
//       solicitud.cita_medica && "Cita Médica",
//       solicitud.licencia && "Licencia",
//       solicitud.compensatorio && "Compensatorio",
//       solicitud.otro && "Otro",
//     ]
//       .filter(Boolean)
//       .join(", ");

//   return (
//     <div className="p-6 max-w-3xl mx-auto bg-white shadow rounded space-y-4">
//       <h2 className="text-2xl font-bold">{titulo}</h2>
//       <p>
//         Área: <b>{solicitud.area_trabajo}</b>
//       </p>
//       <p>
//         Solicitante: <b>{solicitud.nombre_completo}</b>
//       </p>
//       <p>
//         Fecha de creación:{" "}
//         <b>{new Date(solicitud.fecha).toLocaleDateString()}</b>
//       </p>
//       <p>
//         Número de días: <b>{solicitud.numero_dias}</b>, Número de horas:{" "}
//         <b>{solicitud.numero_horas}</b>
//       </p>

//       {/* Botón Aprobar solo para JEFE */}
//       {rol.startsWith("JEFE") && solicitud.estado === "pendiente_jefe" && (
//         <button
//           onClick={handleAprobar}
//           className="bg-green-500 text-white px-4 py-2 rounded"
//         >
//           Aprobar
//         </button>
//       )}

//       {/* Firma para todos */}
//       <div className="mt-4">
//         <input
//           type="text"
//           placeholder="Firma"
//           value={firma}
//           onChange={(e) => setFirma(e.target.value)}
//           className="border p-2 rounded w-full mb-2"
//         />
//         <button
//           onClick={handleFirmar}
//           className="bg-blue-500 text-white px-4 py-2 rounded"
//         >
//           Firmar
//         </button>
//       </div>
//     </div>
//   );
// }
