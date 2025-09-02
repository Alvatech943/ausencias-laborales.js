// src/components/TableroSolicitudes.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { BarChart2, Search, Filter, RotateCcw, Calendar } from "lucide-react";

// Debounce hook para inputs (evita llamadas en cada tecla)
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function TableroSolicitudes() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false); // para actualizaciones sin parpadeo
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const rol = (localStorage.getItem("rol") || "").toLowerCase();

  // --- Filtros controlados ---
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState([]); // ['pendiente_jefe','aprobada',...]
  const [areaId, setAreaId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dir, setDir] = useState("DESC");
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState("fecha");

  // Debounce solo para q (texto). El resto puede disparar fetch inmediato.
  const qDebounced = useDebounce(q, 350);

  // Cancelación de requests
  const abortRef = useRef(null);

  useEffect(() => {
    if (!["jefe", "secretario"].includes(rol)) {
      navigate("/mis-solicitudes", { replace: true });
      return;
    }
    // Carga inicial
    loadBoard(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  // Efecto: refetch al cambiar filtros. Si cambia el texto o cualquier filtro, vuelve a página 1.
  useEffect(() => {
    setPage(1);
  }, [qDebounced, estado, areaId, from, to, dir, limit, sort]);

  useEffect(() => {
    // cuando los filtros (debounced) o page cambien, recargar
    loadBoard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, estado, areaId, from, to, dir, limit, sort, page]);

  function buildParams() {
    return {
      q: qDebounced || undefined,
      estado: estado.length ? estado.join(",") : undefined,
      areaId: areaId || undefined,
      from: from || undefined,
      to: to || undefined,
      sort,
      dir,
      page,
      limit,
    };
  }

  async function loadBoard(isFirst = false) {
    try {
      setErr("");
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (isFirst) setInitialLoading(true);
      else setFetching(true);

      const { data } = await api.get("/solicitudes/board", {
        params: buildParams(),
        signal: controller.signal,
      });

      setData(data);
    } catch (e) {
      if (e.name !== "CanceledError" && e.name !== "AbortError") {
        setErr(e?.response?.data?.error || "No se pudo cargar el tablero");
      }
    } finally {
      setInitialLoading(false);
      setFetching(false);
    }
  }

  // UI helpers
  const total = useMemo(() => {
    if (!data) return 0;
    const t = data.totals || {};
    return (t.pendiente_jefe || 0) + (t.pendiente_secretario || 0) + (t.aprobada || 0) + (t.rechazada || 0);
  }, [data]);

  const activeFiltersCount = useMemo(() => {
    return (q ? 1 : 0) + estado.length + (areaId ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  }, [q, estado, areaId, from, to]);

  function onToggleEstado(k) {
    setEstado((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }
  function clearFilters() {
    setQ("");
    setEstado([]);
    setAreaId("");
    setFrom("");
    setTo("");
    setDir("DESC");
    setLimit(50);
    setSort("fecha");
    setPage(1);
  }

  if (initialLoading) return <div className="p-6 text-gray-600">Cargando tablero…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!data) return null;

  const T = data.totals || {};
  const pagination = data.pagination || { page: 1, pages: 1, count: 0, limit: 50 };

  return (
    <div className="space-y-6 relative">
      {/* Indicador de actualización suave */}
      {fetching && (
        <div className="absolute top-0 left-0 right-0 h-1">
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
          <BarChart2 />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Tablero de Solicitudes</h1>
        <span className="ml-auto text-sm text-gray-500">
          Rol: <b className="uppercase">{rol}</b>
        </span>
      </div>

      {/* Filtros */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Búsqueda (span 4 en lg) */}
          <div className="lg:col-span-4">
            <label className="text-xs text-gray-600">Buscar</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-blue-200">
              <Search size={16} className="text-gray-400" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nombre completo, usuario, motivo o cédula…"
                className="w-full outline-none text-sm"
                autoComplete="off"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Escribe y verás resultados al instante (separar palabras ayuda).
            </p>
          </div>

          {/* Estado (chips) - span 4 en lg */}
          <div className="lg:col-span-4">
            <label className="text-xs text-gray-600 block">Estado</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {[
                { k: "pendiente_jefe", label: "Pend. Jefe" },
                { k: "pendiente_secretario", label: "Pend. Sec." },
                { k: "aprobada", label: "Aprobada" },
                { k: "rechazada", label: "Rechazada" },
              ].map((e) => (
                <button
                  key={e.k}
                  onClick={() => onToggleEstado(e.k)}
                  className={`px-2.5 py-1 rounded-full border text-xs transition ${
                    estado.includes(e.k)
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Área - span 4 en lg */}
          <div className="lg:col-span-4">
            <label className="text-xs text-gray-600">Área</label>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
            >
              <option value="">(Todas)</option>
              {(data.areas || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fechas - span 4 en lg */}
          <div className="lg:col-span-4">
            <label className="text-xs text-gray-600 block">Rango de fechas</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="outline-none text-sm w-full"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="outline-none text-sm w-full"
                />
              </div>
            </div>
          </div>

          {/* Orden/limite/acciones - span 4 en lg */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-600">Ordenar por</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
              >
                <option value="fecha">Fecha</option>
                <option value="id">ID</option>
                <option value="estado">Estado</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Dirección</label>
              <select
                value={dir}
                onChange={(e) => setDir(e.target.value)}
                className="mt-1 rounded-lg border px-3 py-2 text-sm bg-white"
              >
                <option value="DESC">Más recientes</option>
                <option value="ASC">Más antiguos</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Por página</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="mt-1 rounded-lg border px-3 py-2 text-sm bg-white"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={clearFilters}
              className="h-9 mt-1 sm:mt-0 inline-flex items-center gap-2 px-3 rounded-lg border bg-white hover:bg-gray-50 text-sm"
              title="Limpiar filtros"
            >
              <RotateCcw size={16} /> Limpiar
            </button>
          </div>

          {/* Resumen filtros activos */}
          <div className="lg:col-span-12 flex items-center justify-end text-xs text-gray-500 gap-2">
            <Filter size={14} />
            filtros activos: <b>{activeFiltersCount}</b>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi title="Pendiente Jefe" value={T.pendiente_jefe || 0} color="amber" />
        <Kpi title="Pendiente Secretario" value={T.pendiente_secretario || 0} color="blue" />
        <Kpi title="Aprobadas" value={T.aprobada || 0} color="emerald" />
        <Kpi title="Rechazadas" value={T.rechazada || 0} color="rose" />
      </div>

      {/* Gráfica simple */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Distribución por estado</h3>
        <SimpleBarChart totals={T} total={total} />
      </div>

      {/* Por área */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Por área</h3>
          <span className="text-xs text-gray-500">
            Mostrando <b>{data.byArea.length}</b> áreas
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th className="py-2 pr-4">Área</th>
                <th className="py-2 pr-4">Pend. Jefe</th>
                <th className="py-2 pr-4">Pend. Secretario</th>
                <th className="py-2 pr-4">Aprobadas</th>
                <th className="py-2 pr-4">Rechazadas</th>
                <th className="py-2 pr-4">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.byArea.map((r) => (
                <tr key={r.area} className="odd:bg-gray-50/50">
                  <td className="py-2 pr-4 font-medium">{r.area}</td>
                  <td className="py-2 pr-4">{r.pendiente_jefe || 0}</td>
                  <td className="py-2 pr-4">{r.pendiente_secretario || 0}</td>
                  <td className="py-2 pr-4">{r.aprobada || 0}</td>
                  <td className="py-2 pr-4">{r.rechazada || 0}</td>
                  <td className="py-2 pr-4">{r.total || 0}</td>
                </tr>
              ))}
              {data.byArea.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">
                    Sin registros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de solicitudes + paginación */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">
            Solicitudes ({data.items.length}) {fetching && <span className="text-xs text-gray-400"> · actualizando…</span>}
          </h3>
          <div className="text-xs text-gray-500">
            Total coincidencias: <b>{pagination.count}</b>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Empleado</th>
                <th className="py-2 pr-4">Área</th>
                <th className="py-2 pr-4">Motivo</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((s) => (
                <tr key={s.id} className="odd:bg-gray-50/50">
                  <td className="py-2 pr-4">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => navigate(`/solicitudes/${s.id}`)}
                    >
                      #{s.id}
                    </button>
                  </td>
                  <td className="py-2 pr-4">{s.nombre || s.usuario?.nombre || "—"}</td>
                  <td className="py-2 pr-4">{s.dependencia?.nombre || "—"}</td>
                  <td className="py-2 pr-4 truncate max-w-[260px]">{(s.motivo || renderTipo(s)) || "—"}</td>
                  <td className="py-2 pr-4">
                    <EstadoPill estado={s.estado} />
                  </td>
                  <td className="py-2 pr-4">{fmt(s.fecha)}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">
                    Sin registros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="text-gray-600">
            Página <b>{pagination.page}</b> de <b>{pagination.pages}</b>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg border bg-white enabled:hover:bg-gray-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1.5 rounded-lg border bg-white enabled:hover:bg-gray-50 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, color = "gray" }) {
  const map = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    rose: "bg-rose-50 border-rose-200 text-rose-800",
    gray: "bg-gray-50 border-gray-200 text-gray-800",
  };
  return (
    <div className={`rounded-2xl border p-4 ${map[color]}`}>
      <p className="text-xs opacity-80">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function SimpleBarChart({ totals }) {
  const items = [
    { key: "pendiente_jefe", label: "Pend. Jefe", className: "bg-amber-500" },
    { key: "pendiente_secretario", label: "Pend. Secretario", className: "bg-blue-500" },
    { key: "aprobada", label: "Aprobada", className: "bg-emerald-500" },
    { key: "rechazada", label: "Rechazada", className: "bg-rose-500" },
  ];
  const maxVal = Math.max(...items.map((i) => totals[i.key] || 0), 1);

  return (
    <div className="grid grid-cols-4 gap-4 items-end h-48">
      {items.map((i) => {
        const v = totals[i.key] || 0;
        const h = Math.round((v / maxVal) * 100);
        return (
          <div key={i.key} className="flex flex-col items-center">
            <div className="w-12 rounded-t-md" style={{ height: `${h}%` }}>
              <div className={`h-full w-full rounded-t-md ${i.className}`}></div>
            </div>
            <div className="mt-2 text-xs text-gray-600 text-center">
              <div className="font-semibold">{v}</div>
              <div>{i.label}</div>
            </div>
          </div>
        );
      })}
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
    <span
      className={`px-2.5 py-0.5 text-xs rounded-full border font-medium ${
        map[estado] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {estado}
    </span>
  );
}

function fmt(d) {
  return d ? new Date(d).toLocaleString() : "—";
}
function renderTipo(s) {
  const arr = [];
  if (s.estudios) arr.push("Estudios");
  if (s.cita_medica) arr.push("Cita médica");
  if (s.licencia) arr.push("Licencia");
  if (s.compensatorio) arr.push("Compensatorio");
  if (s.otro) arr.push("Otro");
  return arr.join(", ");
}
