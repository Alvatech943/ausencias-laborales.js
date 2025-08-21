export default function SolicitudCard({ solicitud }) {
  return (
    <div className="border p-4 rounded shadow mb-4">
      <h2 className="font-bold">{solicitud.nombre_completo}</h2>
      <p>Cédula: {solicitud.cedula}</p>
      <p>Cargo: {solicitud.cargo}</p>
      <p>Estado: {solicitud.estado}</p>
    </div>
  );
}
