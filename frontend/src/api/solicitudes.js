import axios from 'axios';

const API_URL = 'http://localhost:4000/api/solicitudes';


export const actualizarSolicitud = async (id, data, token) => {
  const res = await axios.patch(`${API_URL}/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};


export async function crearSolicitud(datos, token) {
  const res = await fetch('http://localhost:4000/api/solicitudes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos)
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return await res.json();
}

export async function obtenerSolicitudes(token) {
  const res = await fetch('http://localhost:4000/api/solicitudes', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return await res.json();
}

