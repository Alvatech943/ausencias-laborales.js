// src/components/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ShieldCheck,
  GitBranch,
  PlusCircle,
  UserCog,
  ToggleLeft,
  ToggleRight,
  Search,
  Users,
  Trash2,
  Power,
} from "lucide-react";

export default function AdminDashboard() {
  const token = localStorage.getItem("token");
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const [activeTab, setActiveTab] = useState("estructura"); // estructura | crear | asignaciones | usuarios
  const [deps, setDeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // cache de usuarios por id => { [id]: { id, usuario, nombre } | null }
  const [userCache, setUserCache] = useState({});

  // filtros en estructura
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState("todos"); // todos | activa | inactiva

  // crear dependencia
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("secretaria"); // secretaria | area
  const [padreId, setPadreId] = useState("");
  const [estado, setEstado] = useState("activa");

  // asignaciones
  const [secretariaSel, setSecretariaSel] = useState("");
  const [areaSel, setAreaSel] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedSecretarioId, setSelectedSecretarioId] = useState("");
  const [selectedJefeId, setSelectedJefeId] = useState("");

  // ==== USUARIOS (tab) ====
  const [users, setUsers] = useState([]);
  const [uQ, setUQ] = useState("");
  const [uRol, setURol] = useState("todos"); // todos | EMPLEADO | JEFE | SECRETARIO | SECRETARIO+JEFE
  const [uEstado, setUEstado] = useState("todos"); // todos | activo | inactivo
  const [uLoading, setULoading] = useState(false);
  const [uErr, setUErr] = useState("");

  // ------------------- fetch dependencias -------------------
  const fetchAllDeps = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        "http://localhost:4000/api/dependencias?all=1"
      );
      setDeps(data || []);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.error || "No se pudieron cargar dependencias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDeps();
  }, []);

  // ------------------- derivados -------------------
  const secretarias = useMemo(
    () => deps.filter((d) => !d.dependencia_padre_id),
    [deps]
  );
  const areas = useMemo(
    () => deps.filter((d) => !!d.dependencia_padre_id),
    [deps]
  );

  // Solo activas (para Asignaciones)
  const activeSecretarias = useMemo(
    () => secretarias.filter((s) => (s.estado || "activa") === "activa"),
    [secretarias]
  );
  const activeAreas = useMemo(
    () =>
      areas.filter((a) => {
        const parent = deps.find((d) => d.id === a.dependencia_padre_id);
        return (
          (a.estado || "activa") === "activa" &&
          (parent?.estado || "activa") === "activa"
        );
      }),
    [areas, deps]
  );

  // filtros para estructura
  const filtrar = (items) =>
    items
      .filter((d) =>
        q.trim()
          ? d.nombre.toLowerCase().includes(q.trim().toLowerCase())
          : true
      )
      .filter((d) =>
        fEstado === "todos" ? true : (d.estado || "activa") === fEstado
      );

  const secFiltradas = useMemo(
    () => filtrar(secretarias),
    [secretarias, q, fEstado]
  );
  const areasFiltradas = useMemo(() => filtrar(areas), [areas, q, fEstado]);

  // ------------------- resolver nombres de usuarios por id -------------------
  const fetchUserById = async (id) => {
    if (!id) return null;
    if (userCache[id] !== undefined) return userCache[id];
    try {
      const { data } = await axios.get(
        `http://localhost:4000/api/admin/usuarios/${id}`,
        auth
      );
      setUserCache((prev) => ({ ...prev, [id]: data }));
      return data;
    } catch {
      setUserCache((prev) => ({ ...prev, [id]: null }));
      return null;
    }
  };

  // precarga de ids visibles en Estructura
  useEffect(() => {
    const ids = new Set();
    deps.forEach((d) => {
      if (d.secretario_usuario_id) ids.add(d.secretario_usuario_id);
      if (d.jefe_usuario_id) ids.add(d.jefe_usuario_id);
    });
    if (ids.size === 0) return;
    (async () => {
      await Promise.all(
        Array.from(ids).map((id) => (userCache[id] ? null : fetchUserById(id)))
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps]);

  const userLabel = (id) =>
    userCache[id]?.nombre || userCache[id]?.usuario || "—";

  // ------------------- crear dependencia -------------------
  const createDep = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return alert("Nombre requerido");
    if (tipo === "area" && !padreId) return alert("Selecciona la secretaría padre");

    try {
      await axios.post(
        "http://localhost:4000/api/admin/dependencias",
        {
          nombre: nombre.trim(),
          dependencia_padre_id: tipo === "area" ? Number(padreId) : null,
          estado,
        },
        auth
      );
      setNombre("");
      setTipo("secretaria");
      setPadreId("");
      setEstado("activa");
      await fetchAllDeps();
      alert("✅ Dependencia creada");
      setActiveTab("estructura");
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  // ------------------- alternar estado dependencia -------------------
  const toggleEstadoDep = async (dep) => {
    const next = (dep.estado || "activa") === "activa" ? "inactiva" : "activa";

    // si es ÁREA y queremos ACTIVAR, pero el padre está inactivo → bloquear
    if (next === "activa" && dep.dependencia_padre_id) {
      const padre = deps.find((d) => d.id === dep.dependencia_padre_id);
      if (padre && (padre.estado || "activa") === "inactiva") {
        alert("No se puede activar un área si su secretaría está inactiva");
        return;
      }
    }

    if (!confirm(`¿Cambiar estado de "${dep.nombre}" a ${next}?`)) return;
    try {
      await axios.patch(
        `http://localhost:4000/api/admin/dependencias/${dep.id}/estado`,
        { estado: next },
        auth
      );
      await fetchAllDeps();
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  // ------------------- cargar usuarios para ASIGNACIONES -------------------
  const fetchAllUsersForAssign = async () => {
    try {
      setUsersLoading(true);
      const { data } = await axios.get(
        "http://localhost:4000/api/admin/usuarios",
        auth
      );
      // Solo activos
      const activos = (data || []).filter((u) => (u.estado || "activo") === "activo");
      // Ordenar por nombre, luego usuario
      activos.sort((a, b) =>
        (a.nombre || a.usuario || "").localeCompare(b.nombre || b.usuario || "")
      );
      setAllUsers(activos);
    } catch (e) {
      alert(`❌ No se pudieron cargar usuarios: ${e?.response?.data?.error || e.message}`);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "asignaciones") fetchAllUsersForAssign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ------------------- asignar secretario -------------------
  const assignSecretario = async (e) => {
    e.preventDefault();
    if (!secretariaSel) return alert("Selecciona una secretaría");
    if (!selectedSecretarioId)
      return alert("Selecciona el usuario secretario");

    try {
      await axios.put(
        `http://localhost:4000/api/admin/secretarias/${secretariaSel}/secretario`,
        { usuarioId: Number(selectedSecretarioId) },
        auth
      );
      setSelectedSecretarioId("");
      await fetchAllDeps();
      alert("✅ Secretario asignado");
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  // ------------------- asignar jefe -------------------
  const assignJefe = async (e) => {
    e.preventDefault();
    if (!areaSel) return alert("Selecciona un área");
    if (!selectedJefeId) return alert("Selecciona el usuario jefe");

    try {
      await axios.put(
        `http://localhost:4000/api/admin/areas/${areaSel}/jefe`,
        { usuarioId: Number(selectedJefeId) },
        auth
      );
      setSelectedJefeId("");
      await fetchAllDeps();
      alert("✅ Jefe asignado");
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  // ====================== USUARIOS (tab) ======================
  const fetchUsers = async () => {
    try {
      setULoading(true);
      const { data } = await axios.get(
        "http://localhost:4000/api/admin/usuarios",
        auth
      );
      setUsers(data || []);
      setUErr("");
    } catch (e) {
      setUErr(e?.response?.data?.error || "No se pudieron cargar usuarios");
    } finally {
      setULoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "usuarios") fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const usersFiltered = useMemo(() => {
    let arr = [...users];
    if (uQ.trim()) {
      const s = uQ.trim().toLowerCase();
      arr = arr.filter(
        (u) =>
          u.nombre?.toLowerCase().includes(s) ||
          u.usuario?.toLowerCase().includes(s) ||
          u.cedula?.toLowerCase().includes(s)
      );
    }
    if (uRol !== "todos") {
      arr = arr.filter((u) => u.rol === uRol);
    }
    if (uEstado !== "todos") {
      arr = arr.filter((u) => (u.estado || "activo") === uEstado);
    }
    return arr;
  }, [users, uQ, uRol, uEstado]);

  const toggleEstadoUser = async (u) => {
    const next = (u.estado || "activo") === "activo" ? "inactivo" : "activo";
    if (!confirm(`¿Cambiar estado de ${u.nombre || u.usuario} a ${next}?`)) return;
    try {
      await axios.patch(
        `http://localhost:4000/api/admin/usuarios/${u.id}/estado`,
        { estado: next },
        auth
      );
      await fetchUsers();
      alert("✅ Estado actualizado");
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  const removeJefaturas = async (u) => {
    if (!confirm(`Quitar TODAS las jefaturas de ${u.nombre || u.usuario}?`)) return;
    try {
      await axios.post(
        `http://localhost:4000/api/admin/usuarios/${u.id}/remover-jefaturas`,
        {},
        auth
      );
      await fetchUsers();
      await fetchAllDeps();
      alert("✅ Jefaturas removidas");
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  const removeSecretarias = async (u) => {
    if (!confirm(`Quitar TODAS las secretarías de ${u.nombre || u.usuario}?`)) return;
    try {
      await axios.post(
        `http://localhost:4000/api/admin/usuarios/${u.id}/remover-secretarias`,
        {},
        auth
      );
      await fetchUsers();
      await fetchAllDeps();
      alert("✅ Secretarías removidas");
    } catch (e) {
      alert(`❌ ${e?.response?.data?.error || e.message}`);
    }
  };

  // ------------------- UI -------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <ShieldCheck className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">Administrador</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton
          active={activeTab === "estructura"}
          onClick={() => setActiveTab("estructura")}
        >
          Estructura
        </TabButton>
        <TabButton active={activeTab === "crear"} onClick={() => setActiveTab("crear")}>
          Crear dependencia
        </TabButton>
        <TabButton
          active={activeTab === "asignaciones"}
          onClick={() => setActiveTab("asignaciones")}
        >
          Asignaciones
        </TabButton>
        <TabButton
          active={activeTab === "usuarios"}
          onClick={() => setActiveTab("usuarios")}
        >
          Usuarios
        </TabButton>
      </div>

      {/* Estructura */}
      {activeTab === "estructura" && (
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GitBranch /> Estructura
          </h3>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar dependencia/área…"
                className="outline-none text-sm"
              />
            </div>
            <select
              className="rounded-lg border px-3 py-2 text-sm bg-white"
              value={fEstado}
              onChange={(e) => setFEstado(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="activa">Activas</option>
              <option value="inactiva">Inactivas</option>
            </select>
          </div>

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
                  {secFiltradas.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between border rounded-lg px-3 py-2"
                    >
                      <div>
                        <div className="font-medium">{s.nombre}</div>
                        <div className="text-xs text-gray-500">
                          Estado: {s.estado || "-"} · Secretario: {userLabel(s.secretario_usuario_id)}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleEstadoDep(s)}
                        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-blue-600"
                        title="Activar/Inactivar"
                      >
                        {(s.estado || "activa") === "activa" ? <ToggleRight /> : <ToggleLeft />}{" "}
                        {s.estado || "activa"}
                      </button>
                    </li>
                  ))}
                  {secFiltradas.length === 0 && (
                    <li className="text-sm text-gray-500">Sin coincidencias</li>
                  )}
                </ul>
              </div>

              {/* Áreas */}
              <div>
                <h4 className="font-medium mb-2">Áreas</h4>
                <ul className="space-y-2">
                  {areasFiltradas.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between border rounded-lg px-3 py-2"
                    >
                      <div>
                        <div className="font-medium">{a.nombre}</div>
                        <div className="text-xs text-gray-500">
                          Secretaría:{" "}
                          {deps.find((d) => d.id === a.dependencia_padre_id)?.nombre || "—"} ·
                          Estado: {a.estado || "-"} · Jefe: {userLabel(a.jefe_usuario_id)}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleEstadoDep(a)}
                        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-blue-600"
                        title="Activar/Inactivar"
                      >
                        {(a.estado || "activa") === "activa" ? <ToggleRight /> : <ToggleLeft />}{" "}
                        {a.estado || "activa"}
                      </button>
                    </li>
                  ))}
                  {areasFiltradas.length === 0 && (
                    <li className="text-sm text-gray-500">Sin coincidencias</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Crear dependencia */}
      {activeTab === "crear" && (
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
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="secretaria">Secretaría (raíz)</option>
                <option value="area">Área (hija)</option>
              </select>
            </div>

            {tipo === "area" && (
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
      )}

      {/* Asignaciones */}
      {activeTab === "asignaciones" && (
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserCog /> Asignaciones
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
                  {activeSecretarias.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Usuario (activo)</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                  value={selectedSecretarioId}
                  onChange={(e) => setSelectedSecretarioId(e.target.value)}
                  disabled={usersLoading}
                >
                  <option value="">{usersLoading ? "Cargando…" : "Selecciona…"}
                  </option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre || u.usuario} {u.dependencia?.nombre ? `— ${u.dependencia.nombre}` : ""}
                    </option>
                  ))}
                </select>
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
                  {activeAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} (
                      {deps.find((d) => d.id === a.dependencia_padre_id)?.nombre || "—"}
                      )
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Usuario (activo)</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                  value={selectedJefeId}
                  onChange={(e) => setSelectedJefeId(e.target.value)}
                  disabled={usersLoading}
                >
                  <option value="">{usersLoading ? "Cargando…" : "Selecciona…"}
                  </option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre || u.usuario} {u.dependencia?.nombre ? `— ${u.dependencia.nombre}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  Asignar jefe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Usuarios */}
      {activeTab === "usuarios" && (
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users /> Usuarios
          </h3>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input
                value={uQ}
                onChange={(e) => setUQ(e.target.value)}
                placeholder="Buscar por nombre, usuario o cédula…"
                className="outline-none text-sm"
              />
            </div>
            <select
              className="rounded-lg border px-3 py-2 text-sm bg-white"
              value={uRol}
              onChange={(e) => setURol(e.target.value)}
            >
              <option value="todos">Todos los roles</option>
              <option value="EMPLEADO">Empleado</option>
              <option value="JEFE">Jefe</option>
              <option value="SECRETARIO">Secretario</option>
              <option value="SECRETARIO+JEFE">Secretario+Jefe</option>
            </select>
            <select
              className="rounded-lg border px-3 py-2 text-sm bg-white"
              value={uEstado}
              onChange={(e) => setUEstado(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>

          {uLoading ? (
            <div className="text-gray-500">Cargando…</div>
          ) : uErr ? (
            <div className="text-red-600">{uErr}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-600">
                  <tr>
                    <th className="py-2 pr-4">Nombre</th>
                    <th className="py-2 pr-4">Usuario</th>
                    <th className="py-2 pr-4">Cédula</th>
                    <th className="py-2 pr-4">Dependencia</th>
                    <th className="py-2 pr-4">Rol</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usersFiltered.map((u) => (
                    <tr key={u.id} className="odd:bg-gray-50/50">
                      <td className="py-2 pr-4">{u.nombre || "—"}</td>
                      <td className="py-2 pr-4">{u.usuario}</td>
                      <td className="py-2 pr-4">{u.cedula || "—"}</td>
                      <td className="py-2 pr-4">{u.dependencia?.nombre || "—"}</td>
                      <td className="py-2 pr-4">
                        <RolePill rol={u.rol} />
                      </td>
                      <td className="py-2 pr-4">
                        <EstadoPillUser estado={u.estado || "activo"} />
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleEstadoUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs hover:bg-gray-50"
                            title="Activar/Inactivar usuario"
                          >
                            <Power size={14} />
                            {(u.estado || "activo") === "activo" ? "Inactivar" : "Activar"}
                          </button>

                          {(u.rol === "JEFE" || u.rol === "SECRETARIO+JEFE") && (
                            <button
                              onClick={() => removeJefaturas(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs hover:bg-gray-50"
                              title="Quitar jefaturas"
                            >
                              <Trash2 size={14} />
                              Quitar Jefaturas
                            </button>
                          )}

                          {(u.rol === "SECRETARIO" || u.rol === "SECRETARIO+JEFE") && (
                            <button
                              onClick={() => removeSecretarias(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs hover:bg-gray-50"
                              title="Quitar secretarías"
                            >
                              <Trash2 size={14} />
                              Quitar Secretarías
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {usersFiltered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-gray-500">
                        Sin resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- subcomponentes ---------- */

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-lg text-sm border",
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function RolePill({ rol }) {
  const map = {
    EMPLEADO: "bg-gray-50 text-gray-800 border-gray-200",
    JEFE: "bg-amber-50 text-amber-800 border-amber-200",
    SECRETARIO: "bg-blue-50 text-blue-800 border-blue-200",
    "SECRETARIO+JEFE": "bg-violet-50 text-violet-800 border-violet-200",
  };
  return (
    <span
      className={`px-2.5 py-0.5 text-xs rounded-full border font-medium ${
        map[rol] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {rol}
    </span>
  );
}

function EstadoPillUser({ estado }) {
  const map = {
    activo: "bg-emerald-50 text-emerald-800 border-emerald-200",
    inactivo: "bg-rose-50 text-rose-800 border-rose-200",
  };
  return (
    <span
      className={`px-2.5 py-0.5 text-xs rounded-full border font-medium ${
        map[estado] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {estado}
    </span>
  );
}