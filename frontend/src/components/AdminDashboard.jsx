import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  PlusCircle,
  GitBranch,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  UserCog,
} from "lucide-react";

export default function AdminDashboard() {
  const token = localStorage.getItem("token");
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const [deps, setDeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ---- Crear dependencia
  const [nombre, setNombre] = useState("");
  const [esArea, setEsArea] = useState(false);
  const [padreId, setPadreId] = useState("");
  const [estado, setEstado] = useState("activa");

  // ---- Asignación de SECRETARIO/JEFE
  const [secretariaSel, setSecretariaSel] = useState("");
  const [usuarioSecretario, setUsuarioSecretario] = useState(""); // login o ID

  const [areaSel, setAreaSel] = useState("");
  const [usuarioJefe, setUsuarioJefe] = useState(""); // login o ID

  // Cargar todas las dependencias (incluye inactivas y FKs de jefe/secretario)
  const fetchAll = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("http://localhost:4000/api/dependencias?all=1");
      setDeps(data || []);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.error || "No se pudieron cargar dependencias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Derivados
  const secretarias = useMemo(
    () => deps.filter((d) => !d.dependencia_padre_id),
    [deps]
  );
  const areas = useMemo(
    () => deps.filter((d) => !!d.dependencia_padre_id),
    [deps]
  );

  /* ================== Crear dependencia ================== */
  const createDep = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return alert("Nombre requerido");
    if (esArea && !padreId) return alert("Selecciona la secretaría padre");

    try {
      await axios.post(
        "http://localhost:4000/api/admin/dependencias",
        {
          nombre: nombre.trim(),
          dependencia_padre_id: esArea ? Number(padreId) : null,
          estado,
        },
        auth
      );
      setNombre("");
      setEsArea(false);
      setPadreId("");
      setEstado("activa");
      await fetchAll();
      alert("✅ Dependencia creada");
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  /* ================== Alternar estado dependencia ================== */
  const toggleEstadoDep = async (dep) => {
    const next = dep.estado === "activa" ? "inactiva" : "activa";
    if (!confirm(`¿Cambiar estado de "${dep.nombre}" a ${next}?`)) return;
    try {
      await axios.patch(
        `http://localhost:4000/api/admin/dependencias/${dep.id}/estado`,
        { estado: next },
        auth
      );
      await fetchAll();
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  /* ================== Asignar SECRETARIO ================== */
  const assignSecretario = async (e) => {
    e.preventDefault();
    if (!secretariaSel) return alert("Selecciona una secretaría");
    if (!usuarioSecretario.trim()) return alert("Ingresa el usuario (login) o ID del secretario");

    const body = Number.isFinite(Number(usuarioSecretario))
      ? { usuarioId: Number(usuarioSecretario) }
      : { usuarioLogin: usuarioSecretario.trim() };

    try {
      await axios.put(
        `http://localhost:4000/api/admin/secretarias/${secretariaSel}/secretario`,
        body,
        auth
      );
      setUsuarioSecretario("");
      await fetchAll();
      alert("✅ Secretario asignado");
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  /* ================== Asignar JEFE ================== */
  const assignJefe = async (e) => {
    e.preventDefault();
    if (!areaSel) return alert("Selecciona un área");
    if (!usuarioJefe.trim()) return alert("Ingresa el usuario (login) o ID del jefe");

    const body = Number.isFinite(Number(usuarioJefe))
      ? { usuarioId: Number(usuarioJefe) }
      : { usuarioLogin: usuarioJefe.trim() };

    try {
      await axios.put(
        `http://localhost:4000/api/admin/areas/${areaSel}/jefe`,
        body,
        auth
      );
      setUsuarioJefe("");
      await fetchAll();
      alert("✅ Jefe asignado");
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <ShieldCheck className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">Administrador</h1>
      </header>

      {/* Crear dependencia */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PlusCircle /> Crear dependencia
        </h3>

        <form onSubmit={createDep} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-600">Nombre</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Secretaría de Educación / Área TIC"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">Tipo</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
              value={esArea ? "area" : "secretaria"}
              onChange={(e) => setEsArea(e.target.value === "area")}
            >
              <option value="secretaria">Secretaría (raíz)</option>
              <option value="area">Área (hija)</option>
            </select>
          </div>

          {esArea && (
            <div>
              <label className="text-xs text-gray-600">Secretaría padre</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                value={padreId}
                onChange={(e) => setPadreId(e.target.value)}
              >
                <option value="">Selecciona…</option>
                {secretarias.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-600">Estado</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
          </div>

          <div className="lg:col-span-4 flex justify-end">
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Crear
            </button>
          </div>
        </form>
      </div>

      {/* Estructura (lista + estado) */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <GitBranch /> Estructura
        </h3>

        {loading ? (
          <div className="text-gray-500">Cargando…</div>
        ) : err ? (
          <div className="text-red-600">{err}</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Secretarías */}
            <div>
              <h4 className="font-medium mb-2">Secretarías</h4>
              <ul className="space-y-2">
                {secretarias.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between border rounded-lg px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">{s.nombre}</div>
                      <div className="text-xs text-gray-500">
                        Estado: {s.estado} · SecretarioID: {s.secretario_usuario_id ?? "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleEstadoDep(s)}
                      className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-blue-600"
                      title="Alternar estado"
                    >
                      {s.estado === "activa" ? <ToggleRight /> : <ToggleLeft />} {s.estado}
                    </button>
                  </li>
                ))}
                {secretarias.length === 0 && (
                  <li className="text-sm text-gray-500">No hay secretarías</li>
                )}
              </ul>
            </div>

            {/* Áreas */}
            <div>
              <h4 className="font-medium mb-2">Áreas</h4>
              <ul className="space-y-2">
                {areas.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between border rounded-lg px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">{a.nombre}</div>
                      <div className="text-xs text-gray-500">
                        Padre: {deps.find((d) => d.id === a.dependencia_padre_id)?.nombre || "—"} ·
                        Estado: {a.estado} · JefeID: {a.jefe_usuario_id ?? "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleEstadoDep(a)}
                      className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-blue-600"
                      title="Alternar estado"
                    >
                      {a.estado === "activa" ? <ToggleRight /> : <ToggleLeft />} {a.estado}
                    </button>
                  </li>
                ))}
                {areas.length === 0 && (
                  <li className="text-sm text-gray-500">No hay áreas</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Asignación de SECRETARIO / JEFE */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserCog /> Asignar cargos
        </h3>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Secretario */}
          <form onSubmit={assignSecretario} className="space-y-3">
            <h4 className="font-medium">Secretario de secretaría (raíz)</h4>
            <div>
              <label className="text-xs text-gray-600">Secretaría</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                value={secretariaSel}
                onChange={(e) => setSecretariaSel(e.target.value)}
              >
                <option value="">Selecciona…</option>
                {secretarias.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Usuario (login) o ID</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="ej. juan.perez  /  15"
                value={usuarioSecretario}
                onChange={(e) => setUsuarioSecretario(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                Asignar secretario
              </button>
            </div>
          </form>

          {/* Jefe */}
          <form onSubmit={assignJefe} className="space-y-3">
            <h4 className="font-medium">Jefe de área (hija)</h4>
            <div>
              <label className="text-xs text-gray-600">Área</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                value={areaSel}
                onChange={(e) => setAreaSel(e.target.value)}
              >
                <option value="">Selecciona…</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({deps.find(d => d.id === a.dependencia_padre_id)?.nombre || "—"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Usuario (login) o ID</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="ej. maria.gomez  /  22"
                value={usuarioJefe}
                onChange={(e) => setUsuarioJefe(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                Asignar jefe
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}