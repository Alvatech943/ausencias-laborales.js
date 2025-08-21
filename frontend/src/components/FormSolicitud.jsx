import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function FormSolicitud() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const solicitudId = params.get("id"); // Para jefe/secretario: /solicitud?id=123

  // Rol desde localStorage: "empleado" | "jefe" | "secretario"
  const rol = (localStorage.getItem("rol") || "").toLowerCase();
  const token = localStorage.getItem("token");

  // Opciones de cargo
  const cargoOptions = [
    "Asesores",
    "Profesional",
    "Personal Pasante o adjudicante",
    "Tecnólogo",
    "Tecnico",
    "Asistencial",
    "Topografos y Cardeneros",
    "Tecnico Apoyo Almacen",
    "Prensay Comunicaciones",
    "Fotógrafo o Camarógrafo",
    "Locutor",
    "Diseñador gráfico",
    "Promotor de Lectura",
    "Interprete de lenguaje de Señas colombiana - LSC",
  ];

  const [formData, setFormData] = useState({
    // Empleado (creación)
    nombre_completo: "",
    cedula: "",
    cargo: "",
    secretaria_oficina: "",
    area_trabajo: "",
    estudios: false,
    cita_medica: false,
    licencia: false,
    compensatorio: false,
    otro: false,
    motivo: "",
    fecha_horas: "",
    numero_horas: "",
    hora_inicio: "",
    hora_fin: "",
    numero_dias: "",
    dia_inicio: "",
    dia_fin: "",
    firma_solicitante: "",

    // Jefe (aprobación)
    obs_jefe: "",
    firma_jefe_inmediato: "",
    nombre_jefe_inmediato: "",

    // Secretario (aprobación)
    reviso_si: false,
    reviso_no: false,
    ajusta_ley_si: false,
    ajusta_ley_no: false,
    obs_secretario: "",
    firma_secretario: "",
    nombre_secretario: "",
  });

  const [areasDisponibles] = useState([
    { id: "TIC", nombre: "TIC" },
    { id: "TALENTO HUMANO", nombre: "TALENTO HUMANO" },
    { id: "ARCHIVO", nombre: "ARCHIVO" },
    { id: "ALMACEN", nombre: "ALMACEN" },
  ]);

  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("Formulario de Solicitud");

  // ---------- CARGA INICIAL (solo para jefe/secretario; empleado diligencia manual) ----------
  useEffect(() => {
    (async () => {
      try {
        if (!token) {
          alert("❌ Sesión no válida. Inicia sesión nuevamente.");
          navigate("/login");
          return;
        }

        if (rol === "empleado") {
          setTitulo("Nueva solicitud");
        }

        if (rol === "jefe") {
          setTitulo("Revisión del Jefe");
          if (!solicitudId) {
            alert("⚠️ Falta el id de la solicitud en la URL (?id=123).");
            navigate("/mis-solicitudes");
            return;
          }
          const sRes = await axios.get(`http://localhost:4000/api/solicitudes/${solicitudId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const s = sRes.data || {};
          setFormData((prev) => ({
            ...prev,
            nombre_completo: s.nombre_completo || "",
            cedula: s.cedula || "",
            cargo: s.cargo || "",
            area_trabajo: s.area_trabajo || "",
            secretaria_oficina: s.secretaria_oficina || "",
          }));
        }

        if (rol === "secretario") {
          setTitulo("Revisión del Secretario");
          if (!solicitudId) {
            alert("⚠️ Falta el id de la solicitud en la URL (?id=123).");
            navigate("/mis-solicitudes");
            return;
          }
          const sRes = await axios.get(`http://localhost:4000/api/solicitudes/${solicitudId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const s = sRes.data || {};
          setFormData((prev) => ({
            ...prev,
            nombre_completo: s.nombre_completo || "",
            cedula: s.cedula || "",
            cargo: s.cargo || "",
            area_trabajo: s.area_trabajo || "",
            secretaria_oficina: s.secretaria_oficina || "",
          }));
        }
      } catch (err) {
        console.error(err);
        alert("Error cargando datos iniciales.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, solicitudId]);

  // ---------- AUTO-CÁLCULOS ----------
  useEffect(() => {
    if (formData.dia_inicio && formData.dia_fin) {
      const inicio = new Date(formData.dia_inicio);
      const fin = new Date(formData.dia_fin);
      const diff = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24) + 1;
      setFormData((prev) => ({ ...prev, numero_dias: diff > 0 ? diff : "" }));
    }
  }, [formData.dia_inicio, formData.dia_fin]);

  useEffect(() => {
    if (formData.hora_inicio && formData.hora_fin) {
      const inicio = new Date(`1970-01-01T${formData.hora_inicio}:00`);
      const fin = new Date(`1970-01-01T${formData.hora_fin}:00`);
      const diff = (fin - inicio) / (1000 * 60 * 60);
      setFormData((prev) => ({ ...prev, numero_horas: diff > 0 ? diff : "" }));
    }
  }, [formData.hora_inicio, formData.hora_fin]);

  // ---------- HANDLERS ----------
  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // Exclusividad de checkboxes (motivos, reviso, ajusta_ley)
  const handleExclusive = (group, key) => {
    setFormData((prev) => {
      const next = { ...prev };

      if (group === "motivo") {
        const keys = ["estudios", "cita_medica", "licencia", "compensatorio", "otro"];
        const willActivate = !prev[key]; // si estaba false, se activará; si estaba true, se desactiva todo
        keys.forEach((k) => (next[k] = false));
        next[key] = willActivate;
      }

      if (group === "reviso") {
        const willActivate = !prev[key];
        next.reviso_si = false;
        next.reviso_no = false;
        next[key] = willActivate;
      }

      if (group === "ajusta_ley") {
        const willActivate = !prev[key];
        next.ajusta_ley_si = false;
        next.ajusta_ley_no = false;
        next[key] = willActivate;
      }

      return next;
    });
  };

  // Enviar: crea (empleado) o aprueba (jefe/secretario)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!token) {
        alert("❌ No hay token, inicia sesión nuevamente");
        return;
      }

      if (rol === "empleado") {
        const payload = {
          ...formData,
          numero_horas: formData.numero_horas ? parseInt(formData.numero_horas) : null,
          numero_dias: formData.numero_dias ? parseInt(formData.numero_dias) : null,
        };

        await axios.post("http://localhost:4000/api/solicitudes", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("✅ Solicitud registrada con éxito");
        navigate("/mis-solicitudes");
        return;
      }

      if (rol === "jefe") {
        if (!solicitudId) {
          alert("Falta el id de la solicitud para aprobar.");
          return;
        }
        const payload = {
          aprobadoJefe: true, // o false si haces botón de rechazo
          observaciones: formData.obs_jefe || null,
        };
        await axios.put(
          `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-jefe`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("✅ Revisión del jefe guardada");
        navigate("/mis-solicitudes");
        return;
      }

      if (rol === "secretario") {
        if (!solicitudId) {
          alert("Falta el id de la solicitud para aprobar.");
          return;
        }
        const payload = {
          aprobado: true, // o false
          seAjustaALaLey: formData.ajusta_ley_si === true,
          observaciones: formData.obs_secretario || null,
        };
        await axios.put(
          `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-secretario`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("✅ Revisión del secretario guardada");
        navigate("/mis-solicitudes");
        return;
      }
    } catch (error) {
      console.error(error);
      alert("❌ Error al enviar la información");
    }
  };

  if (loading) {
    return <div className="flex justify-center mt-10 text-gray-600">Cargando…</div>;
  }

  return (
    <div className="flex justify-center mt-6">
      <form
        onSubmit={handleSubmit}
        className="p-6 border rounded shadow-md w-full max-w-2xl bg-white space-y-4"
      >
        <h2 className="text-xl font-bold mb-4 text-center">{titulo}</h2>

        {/* EMPLEADO: crea solicitud */}
       
          <>
            <input
              type="text"
              name="nombre_completo"
              value={formData.nombre_completo}
              onChange={handleChange}
              placeholder="Nombre Completo"
              className="block w-full p-2 border rounded"
              required
            />

            <input
              type="text"
              name="cedula"
              value={formData.cedula}
              onChange={handleChange}
              placeholder="Cédula"
              className="block w-full p-2 border rounded"
              required
            />

            {/* Cargo: lista desplegable */}
            <select
              name="cargo"
              value={formData.cargo}
              onChange={handleChange}
              className="block w-full p-2 border rounded"
              required
            >
              <option value="">Selecciona cargo…</option>
              {cargoOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            {/* Secretaría / Oficina: editable */}
            <input
              type="text"
              name="secretaria_oficina"
              value={formData.secretaria_oficina}
              onChange={handleChange}
              placeholder="Secretaría / Oficina"
              className="block w-full p-2 border rounded"
            />

            {/* Área */}
            <select
              name="area_trabajo"
              value={formData.area_trabajo}
              onChange={handleChange}
              className="block w-full p-2 border rounded"
              required
            >
              <option value="">Selecciona área de trabajo</option>
              {areasDisponibles.map((a) => (
                <option key={a.id} value={a.nombre || a.id}>
                  {a.nombre || a.id}
                </option>
              ))}
            </select>

            {/* Motivo (mutuamente excluyente) */}
            <div className="flex gap-4 flex-wrap">
              <label>
                <input
                  type="checkbox"
                  checked={formData.estudios}
                  onChange={() => handleExclusive("motivo", "estudios")}
                /> Estudios
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.cita_medica}
                  onChange={() => handleExclusive("motivo", "cita_medica")}
                /> Cita Médica
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.licencia}
                  onChange={() => handleExclusive("motivo", "licencia")}
                /> Licencia
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.compensatorio}
                  onChange={() => handleExclusive("motivo", "compensatorio")}
                /> Compensatorio
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.otro}
                  onChange={() => handleExclusive("motivo", "otro")}
                /> Otro
              </label>
            </div>

            <textarea
              name="motivo"
              value={formData.motivo}
              onChange={handleChange}
              placeholder="Motivo de la solicitud"
              className="block w-full p-2 border rounded"
            />

            <div className="grid grid-cols-2 gap-4">
              <input type="date" name="dia_inicio" value={formData.dia_inicio} onChange={handleChange} />
              <input type="date" name="dia_fin" value={formData.dia_fin} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input type="time" name="hora_inicio" value={formData.hora_inicio} onChange={handleChange} />
              <input type="time" name="hora_fin" value={formData.hora_fin} onChange={handleChange} />
            </div>

            <input
              type="number"
              name="numero_dias"
              value={formData.numero_dias}
              readOnly
              className="block w-full p-2 border rounded bg-gray-100"
              placeholder="Número de días"
            />
            <input
              type="number"
              name="numero_horas"
              value={formData.numero_horas}
              readOnly
              className="block w-full p-2 border rounded bg-gray-100"
              placeholder="Número de horas"
            />

            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
              Enviar
            </button>
          </>
      

        {/* JEFE: aprueba/rechaza solicitud existente */}
        {rol === "jefe" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" value={formData.nombre_completo} disabled className="p-2 border rounded bg-gray-100" />
              <input type="text" value={formData.cedula} disabled className="p-2 border rounded bg-gray-100" />
            </div>

            <textarea
              name="obs_jefe"
              value={formData.obs_jefe}
              onChange={handleChange}
              placeholder="Observaciones del jefe"
              className="block w-full p-2 border rounded"
            />

            <div className="flex gap-3">
              <button
                type="button"
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={async () => {
                  await axios.put(
                    `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-jefe`,
                    { aprobadoJefe: true, observaciones: formData.obs_jefe || null },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  alert("✅ Aprobada por jefe");
                  navigate("/mis-solicitudes");
                }}
              >
                Aprobar
              </button>
              <button
                type="button"
                className="bg-red-600 text-white px-4 py-2 rounded"
                onClick={async () => {
                  await axios.put(
                    `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-jefe`,
                    { aprobadoJefe: false, observaciones: formData.obs_jefe || null },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  alert("❌ Rechazada por jefe");
                  navigate("/mis-solicitudes");
                }}
              >
                Rechazar
              </button>
            </div>
          </>
        )}

        {/* SECRETARIO: aprueba/rechaza solicitud existente */}
        {rol === "secretario" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" value={formData.nombre_completo} disabled className="p-2 border rounded bg-gray-100" />
              <input type="text" value={formData.cedula} disabled className="p-2 border rounded bg-gray-100" />
            </div>

            <div className="flex gap-4 flex-wrap">
              <label>
                <input
                  type="checkbox"
                  checked={formData.reviso_si}
                  onChange={() => handleExclusive("reviso", "reviso_si")}
                /> Reviso Sí
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.reviso_no}
                  onChange={() => handleExclusive("reviso", "reviso_no")}
                /> Reviso No
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.ajusta_ley_si}
                  onChange={() => handleExclusive("ajusta_ley", "ajusta_ley_si")}
                /> Ajusta Ley Sí
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.ajusta_ley_no}
                  onChange={() => handleExclusive("ajusta_ley", "ajusta_ley_no")}
                /> Ajusta Ley No
              </label>
            </div>

            <textarea
              name="obs_secretario"
              value={formData.obs_secretario}
              onChange={handleChange}
              placeholder="Observaciones del secretario"
              className="block w-full p-2 border rounded"
            />

            <div className="flex gap-3">
              <button
                type="button"
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={async () => {
                  await axios.put(
                    `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-secretario`,
                    { aprobado: true, seAjustaALaLey: formData.ajusta_ley_si, observaciones: formData.obs_secretario || null },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  alert("✅ Aprobada por secretario");
                  navigate("/mis-solicitudes");
                }}
              >
                Aprobar
              </button>
              <button
                type="button"
                className="bg-red-600 text-white px-4 py-2 rounded"
                onClick={async () => {
                  await axios.put(
                    `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-secretario`,
                    { aprobado: false, seAjustaALaLey: formData.ajusta_ley_si, observaciones: formData.obs_secretario || null },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  alert("❌ Rechazada por secretario");
                  navigate("/mis-solicitudes");
                }}
              >
                Rechazar
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}



// import { useState, useEffect } from "react";
// import axios from "axios";
// import { useNavigate, useSearchParams } from "react-router-dom";

// export default function FormSolicitud() {
//   const navigate = useNavigate();
//   const [params] = useSearchParams();
//   const solicitudId = params.get("id"); // Para jefe/secretario: /solicitud?id=123

//   // Normalizar rol
//   const rol = (localStorage.getItem("rol") || "").toLowerCase(); // "empleado" | "jefe" | "secretario"
//   const idUsuario = localStorage.getItem("idUsuario");
//   const token = localStorage.getItem("token");

//   const [formData, setFormData] = useState({
//     // Empleado (creación)
//     nombre_completo: "",
//     cedula: "",
//     cargo: "",
//     secretaria_oficina: "GENERAL",
//     area_trabajo: "",
//     estudios: false,
//     cita_medica: false,
//     licencia: false,
//     compensatorio: false,
//     otro: false,
//     motivo: "",
//     fecha_horas: "",
//     numero_horas: "",
//     hora_inicio: "",
//     hora_fin: "",
//     numero_dias: "",
//     dia_inicio: "",
//     dia_fin: "",
//     firma_solicitante: "",

//     // Jefe (aprobación)
//     obs_jefe: "",
//     firma_jefe_inmediato: "",
//     nombre_jefe_inmediato: "",

//     // Secretario (aprobación)
//     reviso_si: false,
//     reviso_no: false,
//     ajusta_ley_si: false,
//     ajusta_ley_no: false,
//     obs_secretario: "",
//     firma_secretario: "",
//     nombre_secretario: "",
//   });

//   const [areasDisponibles, setAreasDisponibles] = useState([]); // Opcional dinámico
//   const [loading, setLoading] = useState(true);
//   const [titulo, setTitulo] = useState("Formulario de Solicitud");

//   // ---------- CARGA INICIAL ----------
//   useEffect(() => {
//     (async () => {
//       try {
//         if (!token) {
//           alert("❌ Sesión no válida. Inicia sesión nuevamente.");
//           navigate("/login");
//           return;
//         }

//         if (rol === "empleado") {
//           setTitulo("Nueva solicitud");
//           // 1) Cargar datos del usuario para prellenar
//           const uRes = await axios.get(`http://localhost:4000/api/usuarios/${idUsuario}`, {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//           const user = uRes.data || {};
//           setFormData((prev) => ({
//             ...prev,
//             nombre_completo: user.nombre || "",
//             cedula: user.cedula || "",
//             cargo: user.cargo || "",
//             // Si tu endpoint devuelve { dependencia: 'SECRETARÍA GENERAL', area: 'TIC' }
//             secretaria_oficina: user.dependencia || "GENERAL",
//             area_trabajo: user.area || "",
//           }));

//           // 2) (Opcional) Cargar áreas hijas de la secretaría del usuario
//           // Si tu endpoint soporta esto, descomenta:
//           // if (user.dependencia_id) {
//           //   const aRes = await axios.get(`http://localhost:4000/api/dependencias?parent=${user.dependencia_id}`, {
//           //     headers: { Authorization: `Bearer ${token}` },
//           //   });
//           //   setAreasDisponibles(aRes.data || []);
//           // } else {
//           //   // Fallback estático:
//           //   setAreasDisponibles([
//           //     { id: "TIC", nombre: "TIC" },
//           //     { id: "TALENTO HUMANO", nombre: "TALENTO HUMANO" },
//           //     { id: "ARCHIVO", nombre: "ARCHIVO" },
//           //     { id: "ALMACEN", nombre: "ALMACEN" },
//           //   ]);
//           // }

//           // Fallback si aún no hay endpoint de áreas hijas:
//           setAreasDisponibles([
//             { id: "TIC", nombre: "TIC" },
//             { id: "TALENTO HUMANO", nombre: "TALENTO HUMANO" },
//             { id: "ARCHIVO", nombre: "ARCHIVO" },
//             { id: "ALMACEN", nombre: "ALMACEN" },
//           ]);
//         }

//         if (rol === "jefe") {
//           setTitulo("Revisión del Jefe");
//           // Debe existir ?id= en URL
//           if (!solicitudId) {
//             alert("⚠️ Falta el id de la solicitud en la URL (?id=123).");
//             navigate("/mis-solicitudes");
//             return;
//           }
//           const sRes = await axios.get(`http://localhost:4000/api/solicitudes/${solicitudId}`, {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//           const s = sRes.data || {};
//           // Opcional: prellenar nombres si quieres mostrarlos
//           setFormData((prev) => ({
//             ...prev,
//             nombre_completo: s.nombre_completo || "",
//             cedula: s.cedula || "",
//             cargo: s.cargo || "",
//             area_trabajo: s.area_trabajo || "",
//             secretaria_oficina: s.secretaria_oficina || "GENERAL",
//           }));
//         }

//         if (rol === "secretario") {
//           setTitulo("Revisión del Secretario");
//           // Debe existir ?id= en URL
//           if (!solicitudId) {
//             alert("⚠️ Falta el id de la solicitud en la URL (?id=123).");
//             navigate("/mis-solicitudes");
//             return;
//           }
//           const sRes = await axios.get(`http://localhost:4000/api/solicitudes/${solicitudId}`, {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//           const s = sRes.data || {};
//           setFormData((prev) => ({
//             ...prev,
//             nombre_completo: s.nombre_completo || "",
//             cedula: s.cedula || "",
//             cargo: s.cargo || "",
//             area_trabajo: s.area_trabajo || "",
//             secretaria_oficina: s.secretaria_oficina || "GENERAL",
//           }));
//         }
//       } catch (err) {
//         console.error(err);
//         alert("Error cargando datos iniciales.");
//       } finally {
//         setLoading(false);
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [rol, solicitudId]);

//   // ---------- AUTO-CÁLCULOS ----------
//   useEffect(() => {
//     if (formData.dia_inicio && formData.dia_fin) {
//       const inicio = new Date(formData.dia_inicio);
//       const fin = new Date(formData.dia_fin);
//       const diff = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24) + 1;
//       setFormData((prev) => ({ ...prev, numero_dias: diff > 0 ? diff : "" }));
//     }
//   }, [formData.dia_inicio, formData.dia_fin]);

//   useEffect(() => {
//     if (formData.hora_inicio && formData.hora_fin) {
//       const inicio = new Date(`1970-01-01T${formData.hora_inicio}:00`);
//       const fin = new Date(`1970-01-01T${formData.hora_fin}:00`);
//       const diff = (fin - inicio) / (1000 * 60 * 60);
//       setFormData((prev) => ({ ...prev, numero_horas: diff > 0 ? diff : "" }));
//     }
//   }, [formData.hora_inicio, formData.hora_fin]);

//   // ---------- HANDLERS ----------
//   const handleChange = (e) => {
//     const { name, type, value, checked } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
//   };

//   // Enviar: crea (empleado) o aprueba (jefe/secretario)
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     try {
//       if (!token) {
//         alert("❌ No hay token, inicia sesión nuevamente");
//         return;
//       }

//       if (rol === "empleado") {
//         const payload = {
//           ...formData,
//           numero_horas: formData.numero_horas ? parseInt(formData.numero_horas) : null,
//           numero_dias: formData.numero_dias ? parseInt(formData.numero_dias) : null,
//         };

//         await axios.post("http://localhost:4000/api/solicitudes", payload, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         alert("✅ Solicitud registrada con éxito");
//         navigate("/mis-solicitudes");
//         return;
//       }

//       if (rol === "jefe") {
//         if (!solicitudId) {
//           alert("Falta el id de la solicitud para aprobar.");
//           return;
//         }
//         const payload = {
//           aprobadoJefe: true, // o false si haces botón de rechazo
//           observaciones: formData.obs_jefe || null,
//           // Los campos de firma/nombre puedes enviarlos si backend los guarda aquí
//           // firma_jefe_inmediato: formData.firma_jefe_inmediato,
//           // nombre_jefe_inmediato: formData.nombre_jefe_inmediato,
//         };
//         await axios.put(
//           `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-jefe`,
//           payload,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         alert("✅ Revisión del jefe guardada");
//         navigate("/mis-solicitudes");
//         return;
//       }

//       if (rol === "secretario") {
//         if (!solicitudId) {
//           alert("Falta el id de la solicitud para aprobar.");
//           return;
//         }
//         const payload = {
//           aprobado: true, // o false si haces botón de rechazo
//           seAjustaALaLey: formData.ajusta_ley_si === true,
//           observaciones: formData.obs_secretario || null,
//           // firma_secretario: formData.firma_secretario,
//           // nombre_secretario: formData.nombre_secretario,
//         };
//         await axios.put(
//           `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-secretario`,
//           payload,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         alert("✅ Revisión del secretario guardada");
//         navigate("/mis-solicitudes");
//         return;
//       }
//     } catch (error) {
//       console.error(error);
//       alert("❌ Error al enviar la información");
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center mt-10 text-gray-600">
//         Cargando…
//       </div>
//     );
//   }

//   return (
//     <div className="flex justify-center mt-6">
//       <form
//         onSubmit={handleSubmit}
//         className="p-6 border rounded shadow-md w-full max-w-2xl bg-white space-y-4"
//       >
//         <h2 className="text-xl font-bold mb-4 text-center">{titulo}</h2>

//         {/* EMPLEADO: crea solicitud */}
//         {rol === "empleado" && (
//           <>
//             <input
//               type="text"
//               name="nombre_completo"
//               value={formData.nombre_completo}
//               onChange={handleChange}
//               placeholder="Nombre Completo"
//               className="block w-full p-2 border rounded bg-gray-100"
//               readOnly
//             />
//             <input
//               type="text"
//               name="cedula"
//               value={formData.cedula}
//               onChange={handleChange}
//               placeholder="Cédula"
//               className="block w-full p-2 border rounded bg-gray-100"
//               readOnly
//             />
//             <input
//               type="text"
//               name="cargo"
//               value={formData.cargo}
//               onChange={handleChange}
//               placeholder="Cargo"
//               className="block w-full p-2 border rounded bg-gray-100"
//               readOnly
//             />
//             <input
//               type="text"
//               value={formData.secretaria_oficina}
//               disabled
//               className="block w-full p-2 border rounded bg-gray-100"
//             />

//             {/* Área (dinámico si tienes endpoint; si no, estático) */}
//             <select
//               name="area_trabajo"
//               value={formData.area_trabajo}
//               onChange={handleChange}
//               className="block w-full p-2 border rounded"
//               required
//             >
//               <option value="">Selecciona área de trabajo</option>
//               {areasDisponibles.length > 0
//                 ? areasDisponibles.map((a) => (
//                     <option key={a.id} value={a.nombre || a.id}>
//                       {a.nombre || a.id}
//                     </option>
//                   ))
//                 : (
//                   <>
//                     <option value="TIC">TIC</option>
//                     <option value="TALENTO HUMANO">TALENTO HUMANO</option>
//                     <option value="ARCHIVO">ARCHIVO</option>
//                     <option value="ALMACEN">ALMACEN</option>
//                   </>
//                 )
//               }
//             </select>

//             <div className="flex gap-4 flex-wrap">
//               <label><input type="checkbox" name="estudios" checked={formData.estudios} onChange={handleChange}/> Estudios</label>
//               <label><input type="checkbox" name="cita_medica" checked={formData.cita_medica} onChange={handleChange}/> Cita Médica</label>
//               <label><input type="checkbox" name="licencia" checked={formData.licencia} onChange={handleChange}/> Licencia</label>
//               <label><input type="checkbox" name="compensatorio" checked={formData.compensatorio} onChange={handleChange}/> Compensatorio</label>
//               <label><input type="checkbox" name="otro" checked={formData.otro} onChange={handleChange}/> Otro</label>
//             </div>

//             <textarea
//               name="motivo"
//               value={formData.motivo}
//               onChange={handleChange}
//               placeholder="Motivo de la solicitud"
//               className="block w-full p-2 border rounded"
//             />

//             <div className="grid grid-cols-2 gap-4">
//               <input type="date" name="dia_inicio" value={formData.dia_inicio} onChange={handleChange} />
//               <input type="date" name="dia_fin" value={formData.dia_fin} onChange={handleChange} />
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <input type="time" name="hora_inicio" value={formData.hora_inicio} onChange={handleChange} />
//               <input type="time" name="hora_fin" value={formData.hora_fin} onChange={handleChange} />
//             </div>

//             <input
//               type="number"
//               name="numero_dias"
//               value={formData.numero_dias}
//               readOnly
//               className="block w-full p-2 border rounded bg-gray-100"
//               placeholder="Número de días"
//             />
//             <input
//               type="number"
//               name="numero_horas"
//               value={formData.numero_horas}
//               readOnly
//               className="block w-full p-2 border rounded bg-gray-100"
//               placeholder="Número de horas"
//             />
//           </>
//         )}

//         {/* JEFE: aprueba/rechaza solicitud existente */}
//         {rol === "jefe" && (
//           <>
//             <div className="grid grid-cols-2 gap-4">
//               <input type="text" value={formData.nombre_completo} disabled className="p-2 border rounded bg-gray-100" />
//               <input type="text" value={formData.cedula} disabled className="p-2 border rounded bg-gray-100" />
//             </div>

//             <textarea
//               name="obs_jefe"
//               value={formData.obs_jefe}
//               onChange={handleChange}
//               placeholder="Observaciones del jefe"
//               className="block w-full p-2 border rounded"
//             />

//             <div className="flex gap-3">
//               <button
//                 type="button"
//                 className="bg-green-600 text-white px-4 py-2 rounded"
//                 onClick={async () => {
//                   await axios.put(
//                     `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-jefe`,
//                     { aprobadoJefe: true, observaciones: formData.obs_jefe || null },
//                     { headers: { Authorization: `Bearer ${token}` } }
//                   );
//                   alert("✅ Aprobada por jefe");
//                   navigate("/mis-solicitudes");
//                 }}
//               >
//                 Aprobar
//               </button>
//               <button
//                 type="button"
//                 className="bg-red-600 text-white px-4 py-2 rounded"
//                 onClick={async () => {
//                   await axios.put(
//                     `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-jefe`,
//                     { aprobadoJefe: false, observaciones: formData.obs_jefe || null },
//                     { headers: { Authorization: `Bearer ${token}` } }
//                   );
//                   alert("❌ Rechazada por jefe");
//                   navigate("/mis-solicitudes");
//                 }}
//               >
//                 Rechazar
//               </button>
//             </div>
//           </>
//         )}

//         {/* SECRETARIO: aprueba/rechaza solicitud existente */}
//         {rol === "secretario" && (
//           <>
//             <div className="grid grid-cols-2 gap-4">
//               <input type="text" value={formData.nombre_completo} disabled className="p-2 border rounded bg-gray-100" />
//               <input type="text" value={formData.cedula} disabled className="p-2 border rounded bg-gray-100" />
//             </div>

//             <div className="flex gap-4 flex-wrap">
//               <label><input type="checkbox" name="reviso_si" checked={formData.reviso_si} onChange={handleChange}/> Reviso Sí</label>
//               <label><input type="checkbox" name="reviso_no" checked={formData.reviso_no} onChange={handleChange}/> Reviso No</label>
//               <label><input type="checkbox" name="ajusta_ley_si" checked={formData.ajusta_ley_si} onChange={handleChange}/> Ajusta Ley Sí</label>
//               <label><input type="checkbox" name="ajusta_ley_no" checked={formData.ajusta_ley_no} onChange={handleChange}/> Ajusta Ley No</label>
//             </div>

//             <textarea
//               name="obs_secretario"
//               value={formData.obs_secretario}
//               onChange={handleChange}
//               placeholder="Observaciones del secretario"
//               className="block w-full p-2 border rounded"
//             />

//             <div className="flex gap-3">
//               <button
//                 type="button"
//                 className="bg-green-600 text-white px-4 py-2 rounded"
//                 onClick={async () => {
//                   await axios.put(
//                     `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-secretario`,
//                     { aprobado: true, seAjustaALaLey: formData.ajusta_ley_si, observaciones: formData.obs_secretario || null },
//                     { headers: { Authorization: `Bearer ${token}` } }
//                   );
//                   alert("✅ Aprobada por secretario");
//                   navigate("/mis-solicitudes");
//                 }}
//               >
//                 Aprobar
//               </button>
//               <button
//                 type="button"
//                 className="bg-red-600 text-white px-4 py-2 rounded"
//                 onClick={async () => {
//                   await axios.put(
//                     `http://localhost:4000/api/solicitudes/${solicitudId}/aprobar-secretario`,
//                     { aprobado: false, seAjustaALaLey: formData.ajusta_ley_si, observaciones: formData.obs_secretario || null },
//                     { headers: { Authorization: `Bearer ${token}` } }
//                   );
//                   alert("❌ Rechazada por secretario");
//                   navigate("/mis-solicitudes");
//                 }}
//               >
//                 Rechazar
//               </button>
//             </div>
//           </>
//         )}

//         {/* Botón genérico (solo útil para empleado en este diseño) */}
//         {rol === "empleado" && (
//           <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
//             Enviar
//           </button>
//         )}
//       </form>
//     </div>
//   );
// }




// // import { useState, useEffect } from "react";
// // import axios from "axios";
// // import { useNavigate } from "react-router-dom";

// // export default function FormSolicitud() {
// //   const navigate = useNavigate();
// //   const rol = localStorage.getItem("rol");
// //   const idUsuario = localStorage.getItem("idUsuario");

// //   const [formData, setFormData] = useState({
// //     // Comunes empleado
// //     nombre_completo: "",
// //     cedula: "",
// //     cargo: "",
// //     secretaria_oficina: "GENERAL",
// //     area_trabajo: "",
// //     estudios: false,
// //     cita_medica: false,
// //     licencia: false,
// //     compensatorio: false,
// //     otro: false,
// //     motivo: "",
// //     fecha_horas: "",
// //     numero_horas: "",
// //     hora_inicio: "",
// //     hora_fin: "",
// //     numero_dias: "",
// //     dia_inicio: "",
// //     dia_fin: "",
// //     firma_solicitante: "",

// //     // Jefe
// //     firma_jefe_inmediato: "",
// //     nombre_jefe_inmediato: "",
// //     obs_jefe: "",

// //     // Secretario
// //     reviso_si: false,
// //     reviso_no: false,
// //     ajusta_ley_si: false,
// //     ajusta_ley_no: false,
// //     firma_secretario: "",
// //     nombre_secretario: "",
// //     obs_secretario: "",
// //   });

// //   // 🔹 Cargar datos del usuario logueado para rellenar automáticamente
// //   useEffect(() => {
// //     const fetchUser = async () => {
// //       try {
// //         const token = localStorage.getItem("token");
// //         const res = await axios.get(
// //           `http://localhost:4000/api/usuarios/${idUsuario}`,
// //           {
// //             headers: { Authorization: `Bearer ${token}` },
// //           }
// //         );
// //         const user = res.data;
// //         setFormData((prev) => ({
// //           ...prev,
// //           nombre_completo: user.nombre,
// //           cedula: user.cedula,
// //           cargo: user.cargo || "",
// //           area_trabajo: user.area_trabajo || "",
// //           secretaria_oficina: user.dependencia || "GENERAL",
// //         }));
// //       } catch (err) {
// //         console.error("Error cargando usuario:", err);
// //       }
// //     };
// //     if (rol === "Empleado") fetchUser();
// //   }, [idUsuario, rol]);

// //   // 🔹 Calcular número de días automáticamente
// //   useEffect(() => {
// //     if (formData.dia_inicio && formData.dia_fin) {
// //       const inicio = new Date(formData.dia_inicio);
// //       const fin = new Date(formData.dia_fin);
// //       const diferencia =
// //         (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24) + 1;
// //       setFormData((prev) => ({
// //         ...prev,
// //         numero_dias: diferencia > 0 ? diferencia : "",
// //       }));
// //     }
// //   }, [formData.dia_inicio, formData.dia_fin]);

// //   // 🔹 Calcular número de horas automáticamente
// //   useEffect(() => {
// //     if (formData.hora_inicio && formData.hora_fin) {
// //       const inicio = new Date(`1970-01-01T${formData.hora_inicio}:00`);
// //       const fin = new Date(`1970-01-01T${formData.hora_fin}:00`);
// //       const diferencia = (fin - inicio) / (1000 * 60 * 60);
// //       setFormData((prev) => ({
// //         ...prev,
// //         numero_horas: diferencia > 0 ? diferencia : "",
// //       }));
// //     }
// //   }, [formData.hora_inicio, formData.hora_fin]);

// //   // 🔹 Manejo de inputs
// //   const handleChange = (e) => {
// //     const { name, type, value, checked } = e.target;
// //     setFormData({
// //       ...formData,
// //       [name]: type === "checkbox" ? checked : value,
// //     });
// //   };

// //   // 🔹 Envío del formulario
// //   const handleSubmit = async (e) => {
// //     e.preventDefault();

// //     try {
// //       const token = localStorage.getItem("token");
// //       if (!token) {
// //         alert("❌ No hay token, inicia sesión nuevamente");
// //         return;
// //       }

// //       let cleanData = {};

// //       if (rol === "Empleado") {
// //         cleanData = {
// //           ...formData,
// //           numero_horas: formData.numero_horas
// //             ? parseInt(formData.numero_horas)
// //             : null,
// //           numero_dias: formData.numero_dias
// //             ? parseInt(formData.numero_dias)
// //             : null,
// //         };
// //       }

// //       if (rol === "Jefe") {
// //         cleanData = {
// //           firma_jefe_inmediato: formData.firma_jefe_inmediato,
// //           nombre_jefe_inmediato: formData.nombre_jefe_inmediato,
// //           obs_jefe: formData.obs_jefe,
// //           aprobado_jefe_por: idUsuario,
// //           aprobado_jefe_at: new Date(),
// //           estado: "pendiente_secretario",
// //         };
// //       }

// //       if (rol === "Secretario") {
// //         cleanData = {
// //           reviso_si: formData.reviso_si,
// //           reviso_no: formData.reviso_no,
// //           ajusta_ley_si: formData.ajusta_ley_si,
// //           ajusta_ley_no: formData.ajusta_ley_no,
// //           firma_secretario: formData.firma_secretario,
// //           nombre_secretario: formData.nombre_secretario,
// //           obs_secretario: formData.obs_secretario,
// //           aprobado_secretario_por: idUsuario,
// //           aprobado_secretario_at: new Date(),
// //           estado: "aprobada", // o "rechazada"
// //         };
// //       }

// //       await axios.post("http://localhost:4000/api/solicitudes", cleanData, {
// //         headers: { Authorization: `Bearer ${token}` },
// //       });

// //       alert("✅ Datos enviados correctamente");
// //       navigate("/mis-solicitudes");
// //     } catch (error) {
// //       console.error(error);
// //       alert("❌ Error al enviar la solicitud");
// //     }
// //   };

// //   return (
// //     <div className="flex justify-center mt-6">
// //       <form
// //         onSubmit={handleSubmit}
// //         className="p-6 border rounded shadow-md w-full max-w-2xl bg-white space-y-4"
// //       >
// //         <h2 className="text-xl font-bold mb-4 text-center">
// //           Formulario de Solicitud
// //         </h2>

// //         {/* 🔹 Rol Empleado */}
// //         {rol === "Empleado" && (
// //           <>
// //             <input
// //               type="text"
// //               name="nombre_completo"
// //               value={formData.nombre_completo}
// //               onChange={handleChange}
// //               placeholder="Nombre Completo"
// //               className="block w-full p-2 border rounded bg-gray-100"
// //               readOnly
// //             />

// //             <input
// //               type="text"
// //               name="cedula"
// //               value={formData.cedula}
// //               onChange={handleChange}
// //               placeholder="Cédula"
// //               className="block w-full p-2 border rounded bg-gray-100"
// //               readOnly
// //             />

// //             <input
// //               type="text"
// //               name="cargo"
// //               value={formData.cargo}
// //               onChange={handleChange}
// //               placeholder="Cargo"
// //               className="block w-full p-2 border rounded bg-gray-100"
// //               readOnly
// //             />

// //             <input
// //               type="text"
// //               value={formData.secretaria_oficina}
// //               disabled
// //               className="block w-full p-2 border rounded bg-gray-100"
// //             />

// //             <select
// //               name="area_trabajo"
// //               value={formData.area_trabajo}
// //               onChange={handleChange}
// //               className="block w-full p-2 border rounded"
// //               required
// //             >
// //               <option value="">Selecciona área de trabajo</option>
// //               <option value="TIC">TIC</option>
// //               <option value="TALENTO HUMANO">TALENTO HUMANO</option>
// //               <option value="ARCHIVO">ARCHIVO</option>
// //               <option value="ALMACEN">ALMACEN</option>
// //             </select>

// //             <div className="flex gap-4">
// //               <label>
// //                 <input
// //                   type="checkbox"
// //                   name="estudios"
// //                   checked={formData.estudios}
// //                   onChange={handleChange}
// //                 />{" "}
// //                 Estudios
// //               </label>
// //               <label>
// //                 <input
// //                   type="checkbox"
// //                   name="cita_medica"
// //                   checked={formData.cita_medica}
// //                   onChange={handleChange}
// //                 />{" "}
// //                 Cita Médica
// //               </label>
// //               <label>
// //                 <input
// //                   type="checkbox"
// //                   name="licencia"
// //                   checked={formData.licencia}
// //                   onChange={handleChange}
// //                 />{" "}
// //                 Licencia
// //               </label>
// //               <label>
// //                 <input
// //                   type="checkbox"
// //                   name="compensatorio"
// //                   checked={formData.compensatorio}
// //                   onChange={handleChange}
// //                 />{" "}
// //                 Compensatorio
// //               </label>
// //               <label>
// //                 <input
// //                   type="checkbox"
// //                   name="otro"
// //                   checked={formData.otro}
// //                   onChange={handleChange}
// //                 />{" "}
// //                 Otro
// //               </label>
// //             </div>

// //             <textarea
// //               name="motivo"
// //               value={formData.motivo}
// //               onChange={handleChange}
// //               placeholder="Motivo de la solicitud"
// //               className="block w-full p-2 border rounded"
// //             />

// //             <div className="grid grid-cols-2 gap-4">
// //               <input
// //                 type="date"
// //                 name="dia_inicio"
// //                 value={formData.dia_inicio}
// //                 onChange={handleChange}
// //               />
// //               <input
// //                 type="date"
// //                 name="dia_fin"
// //                 value={formData.dia_fin}
// //                 onChange={handleChange}
// //               />
// //             </div>

// //             <div className="grid grid-cols-2 gap-4">
// //               <input
// //                 type="time"
// //                 name="hora_inicio"
// //                 value={formData.hora_inicio}
// //                 onChange={handleChange}
// //               />
// //               <input
// //                 type="time"
// //                 name="hora_fin"
// //                 value={formData.hora_fin}
// //                 onChange={handleChange}
// //               />
// //             </div>

// //             <input
// //               type="number"
// //               name="numero_dias"
// //               value={formData.numero_dias}
// //               readOnly
// //               className="block w-full p-2 border rounded bg-gray-100"
// //               placeholder="Número de días"
// //             />

// //             <input
// //               type="number"
// //               name="numero_horas"
// //               value={formData.numero_horas}
// //               readOnly
// //               className="block w-full p-2 border rounded bg-gray-100"
// //               placeholder="Número de horas"
// //             />
// //           </>
// //         )}

// //         {/* 🔹 Rol Jefe */}
// //         {rol === "Jefe" && (
// //           <>
// //             <textarea
// //               name="obs_jefe"
// //               value={formData.obs_jefe}
// //               onChange={handleChange}
// //               placeholder="Observaciones del jefe"
// //               className="block w-full p-2 border rounded"
// //             />

// //             <input
// //               type="text"
// //               name="firma_jefe_inmediato"
// //               value={formData.firma_jefe_inmediato}
// //               onChange={handleChange}
// //               placeholder="Firma del jefe"
// //               className="block w-full p-2 border rounded"
// //             />

// //             <input
// //               type="text"
// //               name="nombre_jefe_inmediato"
// //               value={formData.nombre_jefe_inmediato}
// //               onChange={handleChange}
// //               placeholder="Nombre del jefe"
// //               className="block w-full p-2 border rounded"
// //             />
// //           </>
// //         )}

// //         {/* 🔹 Rol Secretario */}
// //         {rol === "Secretario" && (
// //           <>
// //             <label>
// //               <input
// //                 type="checkbox"
// //                 name="reviso_si"
// //                 checked={formData.reviso_si}
// //                 onChange={handleChange}
// //               />{" "}
// //               Reviso Sí
// //             </label>
// //             <label>
// //               <input
// //                 type="checkbox"
// //                 name="reviso_no"
// //                 checked={formData.reviso_no}
// //                 onChange={handleChange}
// //               />{" "}
// //               Reviso No
// //             </label>

// //             <label>
// //               <input
// //                 type="checkbox"
// //                 name="ajusta_ley_si"
// //                 checked={formData.ajusta_ley_si}
// //                 onChange={handleChange}
// //               />{" "}
// //               Ajusta Ley Sí
// //             </label>
// //             <label>
// //               <input
// //                 type="checkbox"
// //                 name="ajusta_ley_no"
// //                 checked={formData.ajusta_ley_no}
// //                 onChange={handleChange}
// //               />{" "}
// //               Ajusta Ley No
// //             </label>

// //             <textarea
// //               name="obs_secretario"
// //               value={formData.obs_secretario}
// //               onChange={handleChange}
// //               placeholder="Observaciones del secretario"
// //               className="block w-full p-2 border rounded"
// //             />

// //             <input
// //               type="text"
// //               name="firma_secretario"
// //               value={formData.firma_secretario}
// //               onChange={handleChange}
// //               placeholder="Firma del secretario"
// //               className="block w-full p-2 border rounded"
// //             />

// //             <input
// //               type="text"
// //               name="nombre_secretario"
// //               value={formData.nombre_secretario}
// //               onChange={handleChange}
// //               placeholder="Nombre del secretario"
// //               className="block w-full p-2 border rounded"
// //             />
// //           </>
// //         )}

// //         <button
// //           type="submit"
// //           className="bg-blue-500 text-white px-4 py-2 rounded"
// //         >
// //           Enviar
// //         </button>
// //       </form>
// //     </div>
// //   );
// // }


// // import { useState, useEffect } from "react";
// // import axios from "axios";
// // import { useNavigate } from "react-router-dom";

// // export default function FormSolicitud() {
// //   const navigate = useNavigate();

// //   const [formData, setFormData] = useState({
// //     nombre_completo: "",
// //     cedula: "",
// //     cargo: "",
// //     secretaria_oficina: "GENERAL",
// //     area_trabajo: "",
// //     estudios: false,
// //     cita_medica: false,
// //     licencia: false,
// //     compensatorio: false,
// //     otro: false,
// //     motivo: "",
// //     fecha_horas: "",
// //     numero_horas: "",
// //     hora_inicio: "",
// //     hora_fin: "",
// //     numero_dias: "",
// //     dia_inicio: "",
// //     dia_fin: "",
// //     firma_solicitante: "",
// //   });

// //   // Calcular número de días automáticamente
// //   useEffect(() => {
// //     if (formData.dia_inicio && formData.dia_fin) {
// //       const inicio = new Date(formData.dia_inicio);
// //       const fin = new Date(formData.dia_fin);
// //       const diferencia =
// //         (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24) + 1;
// //       setFormData((prev) => ({
// //         ...prev,
// //         numero_dias: diferencia > 0 ? diferencia : "",
// //       }));
// //     }
// //   }, [formData.dia_inicio, formData.dia_fin]);

// //   // Calcular número de horas automáticamente
// //   useEffect(() => {
// //     if (formData.hora_inicio && formData.hora_fin) {
// //       const inicio = new Date(`1970-01-01T${formData.hora_inicio}:00`);
// //       const fin = new Date(`1970-01-01T${formData.hora_fin}:00`);
// //       const diferencia = (fin - inicio) / (1000 * 60 * 60);
// //       setFormData((prev) => ({
// //         ...prev,
// //         numero_horas: diferencia > 0 ? diferencia : "",
// //       }));
// //     }
// //   }, [formData.hora_inicio, formData.hora_fin]);

// //   // Manejo de inputs
// //   const handleChange = (e) => {
// //     const { name, type, value, checked } = e.target;
// //     setFormData({
// //       ...formData,
// //       [name]: type === "checkbox" ? checked : value,
// //     });
// //   };

// //   // Envío del formulario
// //   const handleSubmit = async (e) => {
// //     e.preventDefault();

// //     try {
// //       const token = localStorage.getItem("token");
// //       if (!token) {
// //         alert("❌ No hay token, inicia sesión nuevamente");
// //         return;
// //       }

// //       const cleanData = {
// //         ...formData,
// //         numero_horas: formData.numero_horas
// //           ? parseInt(formData.numero_horas)
// //           : null,
// //         numero_dias: formData.numero_dias
// //           ? parseInt(formData.numero_dias)
// //           : null,
// //       };

// //       await axios.post("http://localhost:4000/api/solicitudes", cleanData, {
// //         headers: {
// //           Authorization: `Bearer ${token}`,
// //         },
// //       });

// //       alert("✅ Solicitud registrada con éxito");

// //       // 🔄 Redirige al dashboard/mis solicitudes
// //       navigate("/mis-solicitudes");

// //       // Resetear formulario
// //       setFormData({
// //         nombre_completo: "",
// //         cedula: "",
// //         cargo: "",
// //         secretaria_oficina: "GENERAL",
// //         area_trabajo: "",
// //         estudios: false,
// //         cita_medica: false,
// //         licencia: false,
// //         compensatorio: false,
// //         otro: false,
// //         motivo: "",
// //         fecha_horas: "",
// //         numero_horas: "",
// //         hora_inicio: "",
// //         hora_fin: "",
// //         numero_dias: "",
// //         dia_inicio: "",
// //         dia_fin: "",
// //         firma_solicitante: "",
// //       });
// //     } catch (error) {
// //       console.error(error);
// //       if (error.response?.status === 401) {
// //         alert("⚠️ Sesión expirada o token inválido. Inicia sesión de nuevo.");
// //       } else {
// //         alert("❌ Error al registrar la solicitud");
// //       }
// //     }
// //   };

// //   return (
// //     <div className="flex justify-center mt-6">
// //       <form
// //         onSubmit={handleSubmit}
// //         className="p-6 border rounded shadow-md w-full max-w-2xl bg-white space-y-4"
// //       >
// //         <h2 className="text-xl font-bold mb-4 text-center">
// //           Formulario de Solicitud
// //         </h2>

// //         <input
// //           type="text"
// //           name="nombre_completo"
// //           value={formData.nombre_completo}
// //           onChange={handleChange}
// //           placeholder="Nombre Completo"
// //           className="block w-full p-2 border rounded"
// //           required
// //         />

// //         <input
// //           type="text"
// //           name="cedula"
// //           value={formData.cedula}
// //           onChange={handleChange}
// //           placeholder="Cédula"
// //           className="block w-full p-2 border rounded"
// //           required
// //         />

// //         <input
// //           type="text"
// //           name="cargo"
// //           value={formData.cargo}
// //           onChange={handleChange}
// //           placeholder="Cargo"
// //           className="block w-full p-2 border rounded"
// //           required
// //         />

// //         <input
// //           type="text"
// //           value="GENERAL"
// //           disabled
// //           className="block w-full p-2 border rounded bg-gray-100"
// //         />

// //         <select
// //           name="area_trabajo"
// //           value={formData.area_trabajo}
// //           onChange={handleChange}
// //           className="block w-full p-2 border rounded"
// //           required
// //         >
// //           <option value="">Selecciona área de trabajo</option>
// //           <option value="TIC">TIC</option>
// //           <option value="TALENTO HUMANO">TALENTO HUMANO</option>
// //           <option value="ARCHIVO">ARCHIVO</option>
// //           <option value="ALMACEN">ALMACEN</option>
// //         </select>

// //         <div className="flex gap-4">
// //           <label>
// //             <input
// //               type="checkbox"
// //               name="estudios"
// //               checked={formData.estudios}
// //               onChange={handleChange}
// //             />{" "}
// //             Estudios
// //           </label>
// //           <label>
// //             <input
// //               type="checkbox"
// //               name="cita_medica"
// //               checked={formData.cita_medica}
// //               onChange={handleChange}
// //             />{" "}
// //             Cita Médica
// //           </label>
// //           <label>
// //             <input
// //               type="checkbox"
// //               name="licencia"
// //               checked={formData.licencia}
// //               onChange={handleChange}
// //             />{" "}
// //             Licencia
// //           </label>
// //           <label>
// //             <input
// //               type="checkbox"
// //               name="compensatorio"
// //               checked={formData.compensatorio}
// //               onChange={handleChange}
// //             />{" "}
// //             Compensatorio
// //           </label>
// //           <label>
// //             <input
// //               type="checkbox"
// //               name="otro"
// //               checked={formData.otro}
// //               onChange={handleChange}
// //             />{" "}
// //             Otro
// //           </label>
// //         </div>

// //         <textarea
// //           name="motivo"
// //           value={formData.motivo}
// //           onChange={handleChange}
// //           placeholder="Motivo de la solicitud"
// //           className="block w-full p-2 border rounded"
// //         />

// //         <div className="grid grid-cols-2 gap-4">
// //           <input
// //             type="date"
// //             name="dia_inicio"
// //             value={formData.dia_inicio}
// //             onChange={handleChange}
// //           />
// //           <input
// //             type="date"
// //             name="dia_fin"
// //             value={formData.dia_fin}
// //             onChange={handleChange}
// //           />
// //         </div>

// //         <div className="grid grid-cols-2 gap-4">
// //           <input
// //             type="time"
// //             name="hora_inicio"
// //             value={formData.hora_inicio}
// //             onChange={handleChange}
// //           />
// //           <input
// //             type="time"
// //             name="hora_fin"
// //             value={formData.hora_fin}
// //             onChange={handleChange}
// //           />
// //         </div>

// //         <input
// //           type="number"
// //           name="numero_dias"
// //           value={formData.numero_dias}
// //           readOnly
// //           className="block w-full p-2 border rounded bg-gray-100"
// //           placeholder="Número de días"
// //         />

// //         <input
// //           type="number"
// //           name="numero_horas"
// //           value={formData.numero_horas}
// //           readOnly
// //           className="block w-full p-2 border rounded bg-gray-100"
// //           placeholder="Número de horas"
// //         />

// //         <button
// //           type="submit"
// //           className="bg-blue-500 text-white px-4 py-2 rounded"
// //         >
// //           Enviar
// //         </button>
// //       </form>
// //     </div>
// //   );
// // }
