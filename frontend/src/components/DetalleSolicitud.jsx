// src/components/DetalleSolicitud.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

export default function DetalleSolicitud({ mode = "view" }) {

  const { id } = useParams();
  const navigate = useNavigate();
  const [sol, setSol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Campos de aprobación (jefe/secretario)
  const [obs, setObs] = useState("");
  const [aprobado, setAprobado] = useState(null); // true/false
  const [seAjusta, setSeAjusta] = useState(null); // true/false (solo secretario)

  // Firmas locales (a subir)
  const [firmaJefe, setFirmaJefe] = useState("");           // base64 dataURL
  const [firmaSecretario, setFirmaSecretario] = useState(""); // base64 dataURL

  const isJefe = mode === "jefe";
  const isSecretario = mode === "secretario";
  const rol = (localStorage.getItem("rol") || "").toLowerCase();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/solicitudes/${id}`);
        setSol(data);
      } catch (e) {
        setErr(e?.response?.data?.error || "No se pudo cargar la solicitud");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

  const titulo = useMemo(() => {
    if (!sol) return "";
    return (
      (sol.motivo && sol.motivo.trim()) ||
      [
        sol.estudios && "Estudios",
        sol.cita_medica && "Cita Médica",
        sol.licencia && "Licencia",
        sol.compensatorio && "Compensatorio",
        sol.otro && "Otro",
      ].filter(Boolean).join(", ")
    );
  }, [sol]);

  // Decisiones ya tomadas
  const jefeDecidido = !!sol?.aprobado_jefe_at;
  const secretarioDecidido = !!sol?.aprobado_secretario_at;

  const jefeAprobo =
    jefeDecidido &&
    (sol.estado === "pendiente_secretario" ||
      sol.estado === "aprobada" ||
      (sol.estado === "rechazada" && !!sol.aprobado_secretario_at));

  const jefeRechazo = jefeDecidido && !jefeAprobo;

  const showJefeLectura = jefeDecidido;
  const showSecretarioLectura = secretarioDecidido;

  async function refrescar() {
    const { data } = await api.get(`/solicitudes/${id}`);
    setSol(data);
  }

   async function descargarWord() {
    try {
      const res = await api.get(`/solicitudes/${id}/word`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `A-GTH-F-17 Ausentismo Laboral_${id}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.response?.data?.error || "No se pudo descargar el documento");
    }
  }

  // archivo -> base64 (redimensionado y comprimido)
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

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataURL = canvas.toDataURL('image/jpeg', quality);

          const base = 'data:image/jpeg;base64,';
          const approxBytes = Math.ceil((dataURL.length - base.length) * 3 / 4);
          if (approxBytes > 1.5 * 1024 * 1024) {
            return reject(new Error('La firma es muy grande (>1.5MB). Usa una imagen más pequeña.'));
          }

          resolve(dataURL);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  // onChange para inputs de firma
  async function handleFirmaChange(e, quien) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Por favor sube una imagen (PNG/JPG).");
      e.target.value = "";
      return;
    }
    try {
      const dataURL = await fileToDataURL(file, { maxW: 600, maxH: 250, quality: 0.85 });
      if (quien === "jefe") setFirmaJefe(dataURL);
      if (quien === "secretario") setFirmaSecretario(dataURL);
    } catch (err) {
      alert(err.message || "No se pudo procesar la imagen.");
      e.target.value = "";
    }
  }

  async function enviarDecisionJefe() {
    try {
      setErr(""); setMsg("");
      await api.put(`/solicitudes/${id}/aprobar-jefe`, {
        aprobadoJefe: !!aprobado,
        observaciones: obs || null,
        firma_jefe_inmediato: firmaJefe || null,
      });
      setMsg("Decisión del jefe registrada.");
      await refrescar();
    } catch (e) {
      setErr(e?.response?.data?.error || "Error registrando decisión del jefe");
    }
  }

  async function enviarDecisionSecretario() {
    try {
      setErr(""); setMsg("");
      await api.put(`/solicitudes/${id}/aprobar-secretario`, {
        aprobado: !!aprobado,
        seAjustaALaLey: !!seAjusta,
        observaciones: obs || null,
        firma_secretario: firmaSecretario || null,
      });
      setMsg("Decisión del secretario registrada.");
      await refrescar();
    } catch (e) {
      setErr(e?.response?.data?.error || "Error registrando decisión del secretario");
    }
  }

  // función para descargar
    async function descargarWord() {
    try {
        const res = await api.get(`/solicitudes/${id}/word`, { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `A-GTH-F-17 Ausentismo Laboral_${id}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert(e?.response?.data?.error || "No se pudo descargar el documento");
    }
    }


  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <SkeletonHeader />
        <div className="grid md:grid-cols-2 gap-3 mt-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <p className="text-red-600">{err}</p>
        <button className="mt-4 border px-3 py-1 rounded" onClick={() => navigate(-1)}>← Volver</button>
      </div>
    );
  }
  if (!sol) return null;

  // Paletas (enumeradas para Tailwind JIT)
  const PALETTE = {
    amber:   { dot: "bg-amber-600",   dotSoft: "bg-amber-500",   line: "bg-amber-300",   text: "text-amber-700",   borderL: "border-amber-400" },
    blue:    { dot: "bg-blue-600",    dotSoft: "bg-blue-500",    line: "bg-blue-300",    text: "text-blue-700",    borderL: "border-blue-400" },
    emerald: { dot: "bg-emerald-600", dotSoft: "bg-emerald-500", line: "bg-emerald-300", text: "text-emerald-700", borderL: "border-emerald-400" },
    rose:    { dot: "bg-rose-600",    dotSoft: "bg-rose-500",    line: "bg-rose-300",    text: "text-rose-700",    borderL: "border-rose-400" },
    gray:    { dot: "bg-gray-400",    dotSoft: "bg-gray-300",    line: "bg-gray-200",    text: "text-gray-500",    borderL: "border-gray-300" },
  };

  const { step, paletteKey } = computeStepAndPalette(sol.estado, jefeRechazo);
  const palette = PALETTE[paletteKey] || PALETTE.gray;

  // Resumen superior: última actualización conocida
  const ultimaAct =
    sol.aprobado_secretario_at || sol.aprobado_jefe_at || sol.fecha;

  return (
    <div className="p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {titulo || `Solicitud #${sol.id}`}
              </h1>
              <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>Creada: <span className="font-medium text-gray-800">{fmt(sol.fecha)}</span></span>
                <span>Dependencia: <span className="font-medium text-gray-800">{sol.dependencia?.nombre || "—"}</span></span>
                <span>Última actualización: <span className="font-medium text-gray-800">{fmt(ultimaAct)}</span></span>
              </div>
            </div>
            <EstadoPill estado={sol.estado} />
          </div>

          {/* Stepper con color dinámico */}
          <Stepper step={step} palette={palette} estado={sol.estado} rechazadoEnJefe={jefeRechazo} />
        </div>

        {/* Datos del solicitante */}
        <Section title="Datos del solicitante" subtitle="Información básica y motivo de la ausencia.">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Nombre" value={sol.nombre_completo || sol.usuario?.nombre} />
            <Field label="Cédula" value={sol.cedula || sol.usuario?.cedula} />
            <Field label="Usuario" value={sol.usuario?.usuario} />
            <Field label="Área" value={sol.area_trabajo} />
          </div>

          {/* Motivos como chips */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Motivo seleccionado</p>
            <div className="flex flex-wrap gap-2">
              {renderMotivos(sol).length
                ? renderMotivos(sol).map((m) => (
                    <span
                      key={m}
                      className="px-3 py-1.5 text-sm rounded-full bg-blue-50 border border-blue-200 text-blue-700"
                    >
                      {m}
                    </span>
                  ))
                : <span className="text-gray-600">—</span>}
            </div>
          </div>

          {/* Motivo (texto) destacado */}
          {sol.motivo?.trim() && (
            <div className="mt-5 bg-white border rounded-2xl p-4 shadow-sm">
              <div className={`border-l-4 ${palette.borderL} pl-3`}>
                <p className="text-xs text-gray-500 mb-1">Motivo (texto)</p>
                <p className="text-base leading-relaxed text-gray-900 whitespace-pre-wrap">
                  {sol.motivo}
                </p>
              </div>
            </div>
          )}

          {/* Fechas y horas */}
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            <Field label="N° días" value={sol.numero_dias ?? "—"} />
            <Field label="Día inicio" value={fmt(sol.dia_inicio)} />
            <Field label="Día fin" value={fmt(sol.dia_fin)} />
          </div>
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <Field label="N° horas" value={sol.numero_horas ?? "—"} />
            <Field label="Hora inicio" value={sol.hora_inicio || "—"} />
            <Field label="Hora fin" value={sol.hora_fin || "—"} />
          </div>

          {/* Firma del solicitante */}
          {sol.firma_solicitante && (
            <div className="mt-5">
              <SignatureBlock title="Firma del Solicitante" src={sol.firma_solicitante} />
            </div>
          )}
        </Section>

        {/* Revisión del Jefe (lectura) */}
        {showJefeLectura && (
          <Section title="Revisión del Jefe" subtitle="Resultado y observaciones del jefe inmediato.">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Jefe (usuario)" value={sol.jefe?.usuario || "—"} />
              <Field label="Jefe (nombre)" value={sol.nombre || sol.jefe?.nombre || "—"} />
              <Field
                label="Decisión"
                value={jefeRechazo ? "Rechazada por Jefe" : jefeAprobo ? "Aprobada por Jefe" : "—"}
              />
              <Field label="Fecha decisión Jefe" value={fmt(sol.aprobado_jefe_at)} />
            </div>

            {sol.firma_jefe_inmediato && (
              <SignatureBlock title="Firma del Jefe" src={sol.firma_jefe_inmediato} />
            )}

            <NoteBlock title="Observaciones del Jefe" text={sol.obs_jefe} />
          </Section>
        )}

        {/* Acción del Jefe */}
        {isJefe && sol.estado === "pendiente_jefe" && (
          <ActionCard
            title="Revisión del Jefe"
            desc="Registra tu decisión y adjunta tu firma."
            approvedLabel="Aprobar"
            rejectedLabel="Rechazar"
            aprobado={aprobado}
            setAprobado={setAprobado}
            obs={obs}
            setObs={setObs}
            onFile={(e) => handleFirmaChange(e, "jefe")}
            preview={firmaJefe}
            onSubmit={enviarDecisionJefe}
            onCancel={() => navigate(-1)}
            who="Jefe"
          />
        )}

        {/* Revisión del Secretario (lectura) */}
        {showSecretarioLectura && (
          <Section title="Revisión del Secretario" subtitle="Resultado y observaciones del secretario.">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Secretario (usuario)" value={sol.secretario?.usuario || "—"} />
              <Field label="Secretario (nombre)" value={sol.nombre || sol.secretario?.nombre || "—"} />
              <Field
                label="Decisión"
                value={sol.estado === "aprobada" ? "Aprobada por Secretario" : "Rechazada por Secretario"}
              />
              <Field label="Fecha decisión Secretario" value={fmt(sol.aprobado_secretario_at)} />
              <Field
                label="¿Se ajusta a la ley?"
                value={sol.ajusta_ley_si ? "Sí" : sol.ajusta_ley_no ? "No" : "—"}
              />
            </div>

            {sol.firma_secretario && (
              <SignatureBlock title="Firma del Secretario" src={sol.firma_secretario} />
            )}

            <NoteBlock title="Observaciones del Secretario" text={sol.obs_secretario} />
          </Section>
        )}

        {/* Acción del Secretario */}
        {isSecretario && sol.estado === "pendiente_secretario" && (
          <ActionCard
            title="Revisión del Secretario"
            desc="Registra tu decisión, indica si se ajusta a la ley y adjunta tu firma."
            approvedLabel="Aprobar"
            rejectedLabel="Rechazar"
            aprobado={aprobado}
            setAprobado={setAprobado}
            obs={obs}
            setObs={setObs}
            onFile={(e) => handleFirmaChange(e, "secretario")}
            preview={firmaSecretario}
            onSubmit={enviarDecisionSecretario}
            onCancel={() => navigate(-1)}
            who="Secretario"
            extraLaw={{ seAjusta, setSeAjusta }}
          />
        )}

        <div className="pt-2 flex items-center gap-3">
        <button className="px-4 py-2 rounded border" onClick={() => navigate(-1)}>← Volver</button>

        {(sol.estado === "aprobada" && rol === "empleado") && (
            <button
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={descargarWord}
            >
            Descargar Word
            </button>
        )}

        {msg && <span className="px-3 py-1 rounded bg-green-50 border border-green-200 text-green-800">{msg}</span>}
        {err && <span className="px-3 py-1 rounded bg-red-50 border border-red-200 text-red-700">{err}</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers de color/step ---------- */
function computeStepAndPalette(estado, jefeRechazo) {
  // step: 1 solicitado, 2 jefe, 3 secretario
  if (estado === "pendiente_jefe") return { step: 1, paletteKey: "amber" };
  if (estado === "pendiente_secretario") return { step: 2, paletteKey: "blue" };
  if (estado === "aprobada") return { step: 3, paletteKey: "emerald" };
  // rechazadas:
  return { step: jefeRechazo ? 2 : 3, paletteKey: "rose" };
}

/* ---------- Subcomponentes UI ---------- */

function Section({ title, subtitle, children }) {
  return (
    <section className="bg-white rounded-2xl border p-5 shadow-sm">
      <header className="mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div className="bg-gray-50 border rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value ?? "—"}</p>
    </div>
  );
}

function SignatureBlock({ title, src }) {
  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <div className="bg-white border rounded-xl p-2 inline-flex">
        <img src={src} alt={title} className="h-24 object-contain" />
      </div>
    </div>
  );
}

function NoteBlock({ title, text }) {
  return (
    <div className="mt-3 bg-gray-50 border rounded-2xl p-4">
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className="text-gray-800 whitespace-pre-wrap">{text || "—"}</p>
    </div>
  );
}

function EstadoPill({ estado }) {
  const map = {
    pendiente_jefe: "bg-amber-50 text-amber-800 border-amber-200",
    pendiente_secretario: "bg-blue-50 text-blue-800 border-blue-200",
    aprobada: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rechazada: "bg-rose-50 text-rose-800 border-rose-200",
  };
  return (
    <span className={`px-3 py-1 text-sm rounded-full border font-medium ${map[estado] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {estado}
    </span>
  );
}

function Stepper({ step, palette, estado }) {
  const steps = [
    { id: 1, label: "Solicitado" },
    { id: 2, label: "Jefe" },
    { id: 3, label: "Secretario" },
  ];
  const isRejected = estado === "rechazada";

  return (
    <div className="mt-4">
      <ol className="flex items-center w-full gap-2">
        {steps.map((s, i) => {
          const isCompleted = s.id < step;
          const isCurrent = s.id === step;
          const lineFilled = i < step - 1; // líneas a la izquierda del paso actual

          let circleContent = s.id;
          if (isCompleted && !isRejected) circleContent = "✓";
          if (isCurrent && isRejected) circleContent = "×";

          return (
            <li key={s.id} className="flex items-center flex-1">
              {/* Punto */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={[
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white border border-white shadow-sm",
                    isCompleted || isCurrent ? palette.dot : "bg-gray-200",
                  ].join(" ")}
                  title={s.label}
                >
                  {circleContent}
                </span>
                <span
                  className={[
                    "text-sm truncate",
                    isCompleted || isCurrent ? palette.text : "text-gray-400",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </div>
              {/* Conector */}
              {i !== steps.length - 1 && (
                <div
                  className={[
                    "h-[2px] flex-1 mx-2 rounded",
                    lineFilled ? palette.line : "bg-gray-200",
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  approvedLabel,
  rejectedLabel,
  aprobado,
  setAprobado,
  obs,
  setObs,
  onFile,
  preview,
  onSubmit,
  onCancel,
  who,
  extraLaw, // { seAjusta, setSeAjusta }
}) {
  // Reglas de habilitación:
  const requiereLey = !!extraLaw && aprobado === true;
  const listoParaGuardar =
    (aprobado === true || aprobado === false) &&
    (!requiereLey || extraLaw.seAjusta === true || extraLaw.seAjusta === false);

  return (
    <div className="bg-white rounded-2xl border p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mb-3">{desc}</p>

      <div className="flex flex-wrap gap-4 mb-3">
        <label className="inline-flex items-center gap-2">
          <input type="radio" name={`aprobado-${who}`} onChange={() => setAprobado(true)} />
          <span>{approvedLabel}</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="radio" name={`aprobado-${who}`} onChange={() => setAprobado(false)} />
          <span>{rejectedLabel}</span>
        </label>
      </div>

      {extraLaw && aprobado === true && (
        <div className="mb-3">
          <p className="text-sm mb-1">¿Se ajusta a la ley?</p>
          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name={`ley-${who}`} onChange={() => extraLaw.setSeAjusta(true)} />
              Sí
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name={`ley-${who}`} onChange={() => extraLaw.setSeAjusta(false)} />
              No
            </label>
          </div>
        </div>
      )}

      <textarea
        className="w-full border rounded-2xl p-3 text-sm"
        rows={3}
        placeholder={`Observaciones del ${who.toLowerCase()}`}
        value={obs}
        onChange={(e) => setObs(e.target.value)}
      />

      <div className="mt-3 grid md:grid-cols-[1fr_auto] gap-3 items-start">
        {/* Dropzone estilizada */}
        <label
          htmlFor={`firma-${who}`}
          className="block w-full border-2 border-dashed rounded-xl p-4 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-50"
        >
          <div className="font-medium mb-1">Adjuntar firma del {who}</div>
          <div className="text-xs text-gray-400">JPG o PNG · máx. 1.5 MB (se comprime automáticamente)</div>
          <input
            id={`firma-${who}`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </label>

        {preview && (
          <div className="bg-white border rounded-xl p-2 inline-flex">
            <img src={preview} alt={`Firma ${who}`} className="h-24 object-contain" />
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className={[
            "px-4 py-2 rounded-xl text-white",
            listoParaGuardar ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed",
          ].join(" ")}
          onClick={onSubmit}
          disabled={!listoParaGuardar}
        >
          Guardar decisión
        </button>
        <button className="px-4 py-2 rounded-xl border" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function renderMotivos(sol) {
  const arr = [];
  if (sol.estudios) arr.push("Estudios");
  if (sol.cita_medica) arr.push("Cita médica");
  if (sol.licencia) arr.push("Licencia");
  if (sol.compensatorio) arr.push("Compensatorio");
  if (sol.otro) arr.push("Otro");
  return arr;
}

/* ---------- Skeletons ---------- */

function SkeletonHeader() {
  return (
    <div className="bg-white rounded-2xl border p-5 shadow-sm animate-pulse">
      <div className="h-6 w-1/3 bg-gray-200 rounded mb-3"></div>
      <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
      <div className="mt-3 h-3 w-3/4 bg-gray-200 rounded"></div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm animate-pulse">
      <div className="h-3 w-1/3 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
    </div>
  );
}
