import { useState, useEffect, useMemo } from "react";
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

  const motivoChips = [
    { key: "estudios", label: "Estudios" },
    { key: "cita_medica", label: "Cita médica" },
    { key: "licencia", label: "Licencia" },
    { key: "compensatorio", label: "Compensatorio" },
    { key: "otro", label: "Otro" },
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

  // Firma (base64) del solicitante para previsualizar y enviar
  const [firmaEmpleado, setFirmaEmpleado] = useState("");

  const [areasDisponibles] = useState([
    { id: "TIC", nombre: "TIC" },
    { id: "TALENTO HUMANO", nombre: "TALENTO HUMANO" },
    { id: "ARCHIVO", nombre: "ARCHIVO" },
    { id: "ALMACEN", nombre: "ALMACEN" },
  ]);

  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("Formulario de Solicitud");
  const [errorMsg, setErrorMsg] = useState("");

  // ---------- util: archivo -> base64 comprimido ----------
  const fileToDataURL = (file, { maxW = 600, maxH = 250, quality = 0.85 } = {}) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const ratio = Math.min(maxW / width, maxH / height, 1);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const dataURL = canvas.toDataURL("image/jpeg", quality);

          // Comprobación aproximada de tamaño
          const base = "data:image/jpeg;base64,";
          const approxBytes = Math.ceil((dataURL.length - base.length) * 3 / 4);
          if (approxBytes > 1.5 * 1024 * 1024) {
            return reject(new Error("La firma es muy grande (>1.5MB). Usa una imagen más pequeña."));
          }

          resolve(dataURL);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  const handleFirmaEmpleadoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Por favor sube una imagen (PNG/JPG).");
      e.target.value = "";
      return;
    }
    try {
      const dataURL = await fileToDataURL(file, { maxW: 600, maxH: 250, quality: 0.85 });
      setFirmaEmpleado(dataURL);
      setFormData((prev) => ({ ...prev, firma_solicitante: dataURL }));
    } catch (err) {
      alert(err.message || "No se pudo procesar la imagen.");
      e.target.value = "";
    }
  };

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
        const willActivate = !prev[key];
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

  // Validaciones mínimas
  const canSubmit = useMemo(() => {
    if (rol !== "empleado") return true; // jefe/secretario no envían desde aquí
    if (!formData.nombre_completo || !formData.cedula || !formData.cargo || !formData.area_trabajo) return false;
    if (!firmaEmpleado) return false;
    // Al menos un motivo
    const hasMotivo = ["estudios", "cita_medica", "licencia", "compensatorio", "otro"].some((k) => formData[k]);
    if (!hasMotivo) return false;
    return true;
  }, [rol, formData, firmaEmpleado]);

  // Enviar: crea (empleado) o aprueba (jefe/secretario)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setErrorMsg("");
      if (!token) {
        setErrorMsg("No hay token, inicia sesión nuevamente");
        return;
      }

      if (rol === "empleado") {
        if (!canSubmit) {
          setErrorMsg("Completa todos los campos obligatorios y adjunta la firma.");
          return;
        }

        const payload = {
          ...formData,
          firma_solicitante: firmaEmpleado, // <-- importante
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
          setErrorMsg("Falta el id de la solicitud para aprobar.");
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
          setErrorMsg("Falta el id de la solicitud para aprobar.");
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
      setErrorMsg("Error al enviar la información");
    }
  };

  if (loading) {
    return <div className="flex justify-center mt-10 text-gray-600">Cargando…</div>;
  }

  // UI Helpers
  const Badge = ({ children }) => (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
      {children}
    </span>
  );

  const motiveSelected =
    motivoChips.filter((m) => formData[m.key]).map((m) => m.label).join(", ") || "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-8">
        {/* Header Card */}
        <div className="mb-6 bg-white border rounded-2xl shadow-sm p-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{titulo}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Rellena la información requerida y adjunta tu firma digital.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>Rol: {rol || "—"}</Badge>
            <Badge>{motiveSelected !== "—" ? motiveSelected : "Sin motivo seleccionado"}</Badge>
          </div>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border rounded-2xl shadow-sm p-6 space-y-8"
        >
          {/* Sección: Datos del solicitante */}
          <Section title="Datos del solicitante" subtitle="Información básica del empleado.">
            <div className="grid md:grid-cols-2 gap-4">
              <LabeledInput
                label="Nombre completo"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                required
              />
              <LabeledInput
                label="Cédula"
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
                required
              />
              <LabeledSelect
                label="Cargo"
                name="cargo"
                value={formData.cargo}
                onChange={handleChange}
                required
                options={cargoOptions}
              />
              <LabeledInput
                label="Secretaría / Oficina"
                name="secretaria_oficina"
                value={formData.secretaria_oficina}
                onChange={handleChange}
              />
              <LabeledSelect
                label="Área de trabajo"
                name="area_trabajo"
                value={formData.area_trabajo}
                onChange={handleChange}
                required
                options={areasDisponibles.map((a) => a.nombre || a.id)}
              />
            </div>
          </Section>

          {/* Sección: Motivo */}
          <Section title="Motivo" subtitle="Selecciona un motivo (solo uno) y describe la solicitud.">
            <div className="flex flex-wrap gap-2">
              {motivoChips.map((m) => {
                const active = formData[m.key];
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => handleExclusive("motivo", m.key)}
                    className={[
                      "px-3 py-1.5 rounded-full text-sm border transition",
                      active
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <LabeledTextarea
                label="Descripción del motivo"
                name="motivo"
                value={formData.motivo}
                onChange={handleChange}
                rows={5}
                maxLength={800}
                placeholder="Describe brevemente la razón de la ausencia (máximo 800 caracteres)."
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {formData.motivo?.length || 0}/800
              </p>
            </div>
          </Section>

          {/* Sección: Tiempo */}
          <Section
            title="Tiempo"
            subtitle="Indica días o, si aplica, horas específicas (si llenas horas no es necesario llenar días)."
          >
            <div className="grid md:grid-cols-2 gap-4">
              <LabeledInput
                type="date"
                label="Día de inicio"
                name="dia_inicio"
                value={formData.dia_inicio}
                onChange={handleChange}
              />
              <LabeledInput
                type="date"
                label="Día de fin"
                name="dia_fin"
                value={formData.dia_fin}
                onChange={handleChange}
              />
              <LabeledInput
                type="time"
                label="Hora inicio"
                name="hora_inicio"
                value={formData.hora_inicio}
                onChange={handleChange}
              />
              <LabeledInput
                type="time"
                label="Hora fin"
                name="hora_fin"
                value={formData.hora_fin}
                onChange={handleChange}
              />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Pill label="N.º de días" value={formData.numero_dias || "—"} />
              <Pill label="N.º de horas" value={formData.numero_horas || "—"} />
            </div>
          </Section>

          {/* Sección: Firma */}
          <Section
            title="Firma del solicitante"
            subtitle="Adjunta una imagen de tu firma (JPG o PNG)."
          >
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div>
                <label
                  htmlFor="firma-upload"
                  className="block w-full border-2 border-dashed rounded-xl p-4 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-50"
                >
                  <div className="font-medium mb-1">Subir imagen</div>
                  <div className="text-xs text-gray-400">Máx. 1.5 MB (se comprime automáticamente)</div>
                  <input
                    id="firma-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFirmaEmpleadoChange}
                  />
                </label>
                {!firmaEmpleado && (
                  <p className="mt-2 text-xs text-gray-500">
                    * Obligatorio para enviar la solicitud.
                  </p>
                )}
              </div>

              {firmaEmpleado && (
                <div className="bg-white border rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-2">Vista previa</p>
                  <img
                    src={firmaEmpleado}
                    alt="Firma del solicitante (previa)"
                    className="h-24 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFirmaEmpleado("");
                      setFormData((p) => ({ ...p, firma_solicitante: "" }));
                    }}
                    className="mt-3 text-xs text-red-600 hover:underline"
                  >
                    Quitar firma
                  </button>
                </div>
              )}
            </div>
          </Section>

          {/* Errores */}
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">
              {errorMsg}
            </div>
          )}

          {/* Sticky Footer Actions */}
          <div className="h-4" />
          <div className="fixed left-0 right-0 bottom-0 bg-white/80 backdrop-blur border-t">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Revisa que los datos sean correctos antes de enviar.
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rol === "empleado" && !canSubmit}
                  className={[
                    "px-4 py-2 rounded-lg text-white",
                    rol === "empleado" && !canSubmit
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700",
                  ].join(" ")}
                >
                  {rol === "empleado" ? "Enviar solicitud" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="h-28" />
      </div>
    </div>
  );
}

/* ---------- UI Subcomponentes ---------- */

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="p-4 border rounded-xl">{children}</div>
    </section>
  );
}

function LabeledInput({ label, name, value, onChange, type = "text", required = false }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700">{label}{required && " *"}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
      />
    </label>
  );
}

function LabeledSelect({ label, name, value, onChange, options = [], required = false }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700">{label}{required && " *"}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
      >
        <option value="">Selecciona…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

function LabeledTextarea({ label, name, value, onChange, rows = 4, maxLength = 800, placeholder = "" }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700">{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
      />
    </label>
  );
}

function Pill({ label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
