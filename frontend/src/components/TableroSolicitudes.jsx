// src/components/TableroSolicitudes.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { BarChart2, Search, Filter, RotateCcw, Calendar } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  Tooltip as RTooltip, Legend, Label,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

/* =========================
   Utils & UI helpers
   ========================= */

function classNames(...xs) { return xs.filter(Boolean).join(" "); }
function num(n) { return n ?? 0; }
function pct(part, total) {
  const t = total || 0;
  return t <= 0 ? 0 : Math.round((part / t) * 100);
}

// Debounce hook para inputs (evita llamadas en cada tecla)
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// Cabecera ordenable reutilizable
function ThSortable({ label, sortKey, sort, dir, onSort }) {
  const active = sort === sortKey;
  const arrow = !active ? "↕" : dir === "ASC" ? "↑" : "↓";
  return (
    <th
      scope="col"
      className={classNames(
        "py-2 pr-4 font-semibold text-gray-700 select-none sticky top-0 bg-white z-10",
        "cursor-pointer hover:text-gray-900"
      )}
      onClick={() => onSort(sortKey)}
      title={`Ordenar por ${label}`}
    >
      <span className="inline-flex items-center gap-1">
        {label} <span className="text-gray-400 text-xs">{arrow}</span>
      </span>
    </th>
  );
}

// Celda con barra mini (para tabla por área)
function DataBarCell({ value = 0, total = 0, color = "bg-blue-500" }) {
  const w = pct(value, total);
  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>{value}</span>
        <span>{w}%</span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={classNames("h-full", color)} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

// Skeleton de tabla
function TableSkeleton({ rows = 6, cols = 6 }) {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="py-2 pr-4">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="odd:bg-gray-50/50">
                {Array.from({ length: cols }).map((__, c) => (
                  <td key={c} className="py-2 pr-4">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================
   Colores consistentes
   ========================= */
const COLORS = {
  pendiente_jefe:   "#f59e0b", // amber-500
  pendiente_secretario: "#3b82f6", // blue-500
  aprobada:         "#10b981", // emerald-500
  rechazada:        "#f43f5e", // rose-500
};
const STATE_KEYS = ["pendiente_jefe", "pendiente_secretario", "aprobada", "rechazada"];
const STATE_LABELS = {
  pendiente_jefe: "Pend. Jefe",
  pendiente_secretario: "Pend. Secretario",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

/* =========================
   Componentes de UI
   ========================= */

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

function EstadoPill({ estado, onClick, active }) {
  const map = {
    pendiente_jefe: "bg-amber-50 text-amber-800 border-amber-200",
    pendiente_secretario: "bg-blue-50 text-blue-800 border-blue-200",
    aprobada: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rechazada: "bg-rose-50 text-rose-800 border-rose-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "px-2.5 py-0.5 text-xs rounded-full border font-medium transition",
        map[estado] || "bg-gray-50 text-gray-700 border-gray-200",
        onClick && "hover:brightness-95",
        active && "ring-2 ring-offset-1 ring-blue-300"
      )}
      title={onClick ? "Filtrar por este estado" : estado}
    >
      {estado}
    </button>
  );
}

/* =========================
   Gráficas (Recharts)
   ========================= */

function DonutEstadoChart({ totals }) {
  const data = STATE_KEYS.map((k) => ({ name: STATE_LABELS[k], key: k, value: num(totals?.[k]) }));
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <RTooltip formatter={(value, name) => [`${value} (${pct(value, total)}%)`, name]} />
          <Legend verticalAlign="bottom" height={36} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key]} />
            ))}
            <Label
              value={total}
              position="center"
              className="text-gray-800"
              content={({ viewBox }) => {
                const { cx, cy } = viewBox;
                return (
                  <g>
                    <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="700">
                      {total}
                    </text>
                    <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="central" fontSize="12" fill="#6b7280">
                      Total
                    </text>
                  </g>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function StackedByAreaChart({ rows = [] }) {
  const data = rows.map((r) => ({
    area: r.area,
    pendiente_jefe: num(r.pendiente_jefe),
    pendiente_secretario: num(r.pendiente_secretario),
    aprobada: num(r.aprobada),
    rechazada: num(r.rechazada),
  }));
  const withTotal = data.map((d) => ({ ...d, total: STATE_KEYS.reduce((acc, k) => acc + d[k], 0) }));
  const top = withTotal.sort((a, b) => b.total - a.total).slice(0, 12);

  return (
    <div className="h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} stackOffset="normal" margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="area" tick={{ fontSize: 11 }} interval={0} height={60} angle={-20} textAnchor="end" />
          <YAxis allowDecimals={false} />
          <RTooltip />
          <Legend />
          <Bar dataKey="pendiente_jefe" stackId="a" name={STATE_LABELS.pendiente_jefe} fill={COLORS.pendiente_jefe} />
          <Bar dataKey="pendiente_secretario" stackId="a" name={STATE_LABELS.pendiente_secretario} fill={COLORS.pendiente_secretario} />
          <Bar dataKey="aprobada" stackId="a" name={STATE_LABELS.aprobada} fill={COLORS.aprobada} />
          <Bar dataKey="rechazada" stackId="a" name={STATE_LABELS.rechazada} fill={COLORS.rechazada} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =========================
   Main: Tablero
   ========================= */

export default function TableroSolicitudes() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const rol = (localStorage.getItem("rol") || "").toLowerCase();

  // --- Filtros controlados ---
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState([]); // ['pendiente_jefe','aprobada',...]
  const [secretariaId, setSecretariaId] = useState(""); // NUEVO
  const [areaId, setAreaId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dir, setDir] = useState("DESC");
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState("fecha");

  // Debounce para texto y fechas
  const qDebounced = useDebounce(q, 350);
  const fromDebounced = useDebounce(from, 300);
  const toDebounced   = useDebounce(to, 300);

  // Resetear área cuando cambia la secretaría
  useEffect(() => { setAreaId(""); }, [secretariaId]);

  // Cancelación de requests
  const abortRef = useRef(null);

  useEffect(() => {
    if (!["jefe", "secretario", "admin"].includes(rol)) {
      navigate("/mis-solicitudes", { replace: true });
      return;
    }
    loadBoard(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  // Auto-seleccionar secretaría si el usuario (secretario o jefe) solo tiene UNA visible
  useEffect(() => {
    if (!data) return;
    if (!["secretario", "jefe"].includes(rol)) return;
    if (secretariaId) return; // ya hay una seleccionada (no pisar elección del usuario)

    const secs = data.secretarias || [];
    if (secs.length === 1) {
      setSecretariaId(String(secs[0].id)); // dispara refetch y cargarán sus áreas
    }
  }, [data, rol, secretariaId]);

  // Auto-seleccionar área si (rol jefe) y hay exactamente UNA área visible para la secretaría elegida
  useEffect(() => {
    if (!data) return;
    if (rol !== "jefe") return;
    if (!secretariaId) return; // aún no hay secretaría, nada que autoseleccionar
    if (areaId) return; // ya hay un área seleccionada

    const areas = data.areas || [];
    if (areas.length === 1) {
      setAreaId(String(areas[0].id));
    }
  }, [data, rol, secretariaId, areaId]);


  // Volver a página 1 ante cambios de filtros visibles
  useEffect(() => {
    setPage(1);
  }, [qDebounced, estado, secretariaId, areaId, fromDebounced, toDebounced, dir, limit, sort]);

  // Refetch cuando cambien filtros o página
  useEffect(() => {
    loadBoard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, estado, secretariaId, areaId, fromDebounced, toDebounced, dir, limit, sort, page]);

  function buildParams() {
    return {
      q: qDebounced || undefined,
      estado: estado.length ? estado.join(",") : undefined,
      secretariaId: secretariaId || undefined,
      areaId: areaId || undefined,
      from: fromDebounced || undefined,
      to: toDebounced || undefined,
      sort,
      dir,
      page,
      limit,
    };
  }

  async function loadBoard(isFirst = false) {
    try {
      setErr("");

      // ✅ Validación de rango de fechas (no dispares si es inválido)
      if (fromDebounced && toDebounced && fromDebounced > toDebounced) {
        setErr("Rango de fechas inválido: la fecha inicial es mayor que la final.");
        if (isFirst) setInitialLoading(false);
        setFetching(false);
        return;
      }

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
    return (q ? 1 : 0)
      + estado.length
      + (secretariaId ? 1 : 0)
      + (areaId ? 1 : 0)
      + (from ? 1 : 0)
      + (to ? 1 : 0);
  }, [q, estado, secretariaId, areaId, from, to]);

  function onToggleEstado(k) {
    setEstado((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }
  function clearFilters() {
    setQ("");
    setEstado([]);
    setSecretariaId("");
    setAreaId("");
    setFrom("");
    setTo("");
    setDir("DESC");
    setLimit(50);
    setSort("fecha");
    setPage(1);
  }
  function handleSort(nextKey) {
    if (sort === nextKey) setDir((d) => (d === "ASC" ? "DESC" : "ASC"));
    else { setSort(nextKey); setDir("DESC"); }
    setPage(1);
  }

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="p-6 text-gray-600">Cargando tablero…</div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <TableSkeleton rows={5} cols={6} />
        </div>
      </div>
    );
  }
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
      <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-4">
        {/* Header de filtros */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Buscar */}
          <div className="flex-1">
            <label className="text-xs text-gray-600">Buscar</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-blue-200">
              <Search size={16} className="text-gray-400" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nombre, usuario, motivo o cédula…"
                className="w-full outline-none text-sm"
                autoComplete="off"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Escribe y verás resultados al instante (separar palabras ayuda).
            </p>
          </div>

          {/* Resumen + Limpiar */}
          <div className="flex items-center justify-between lg:justify-end gap-2">
            <span className="inline-flex items-center gap-2 text-xs text-gray-600">
              <Filter size={14} />
              filtros activos: <b>{activeFiltersCount}</b>
            </span>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border bg-white hover:bg-gray-50 text-sm"
              title="Limpiar filtros"
            >
              <RotateCcw size={16} /> Limpiar
            </button>
          </div>
        </div>

        {/* Línea 2: Secretaría / Área */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Secretaría */}
          <div className="lg:col-span-6">
            <label className="text-xs text-gray-600">Secretaría</label>
            <select
              value={secretariaId}
              onChange={(e) => setSecretariaId(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
            >
              <option value="">(Todas)</option>
              {(data.secretarias || []).map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500">
              Selecciona una secretaría para ver sus áreas hijas.
            </p>
          </div>

          {/* Área (solo si hay hijas) */}
          {(data.areas || []).length > 0 && (
            <div className="lg:col-span-6">
              <label className="text-xs text-gray-600">Área</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
              >
                <option value="">(Todas)</option>
                {data.areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Línea 3: Estado (chips) */}
        <div>
          <label className="text-xs text-gray-600 block">Estado</label>
          <div className="mt-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {STATE_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => onToggleEstado(k)}
                className={classNames(
                  "px-2.5 py-1 rounded-full border text-xs whitespace-nowrap transition",
                  estado.includes(k)
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                {STATE_LABELS[k]}
              </button>
            ))}
          </div>
        </div>

        {/* Línea 4: Fechas + atajos y Orden/Dir/Limit */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Fechas + atajos */}
          <div className="lg:col-span-7 space-y-2">
            <label className="text-xs text-gray-600 block">Rango de fechas</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  max={to || undefined}
                  className="outline-none text-sm w-full"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  min={from || undefined}
                  className="outline-none text-sm w-full"
                />
              </div>
            </div>

            {/* Atajos rápidos */}
            {/* <div className="flex flex-wrap items-center gap-2">
              {[
                { k: "hoy", label: "Hoy" },
                { k: "7", label: "Últimos 7 días" },
                { k: "mes", label: "Este mes" },
                { k: "30", label: "Últimos 30 días" },
              ].map((r) => (
                <button
                  key={r.k}
                  onClick={() => applyQuickRange(r.k)}
                  className="text-xs px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50"
                >
                  {r.label}
                </button>
              ))}
            </div> */}

            {/* Aviso de rango inválido */}
            {fromDebounced && toDebounced && fromDebounced > toDebounced && (
              <p className="text-xs text-rose-600">
                Rango inválido: la fecha inicial no puede ser mayor que la final.
              </p>
            )}
          </div>

          {/* Orden / Dir / Por página */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
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
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
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
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
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

      {/* Distribución por estado (DONUT) */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Distribución por estado</h3>
          <span className="text-xs text-gray-500">Total: <b>{total}</b></span>
        </div>
        <DonutEstadoChart totals={T} />
      </div>

      {/* Skeleton durante fetching (opcional) */}
      {fetching && (
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <TableSkeleton rows={5} cols={6} />
        </div>
      )}

      {/* Por área: barras apiladas + tabla detalle */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Por área (gráfico)</h3>
          <span className="text-xs text-gray-500">Mostrando top 12 por total</span>
        </div>
        <StackedByAreaChart rows={data.byArea || []} />
      </div>

      {/* Por área: tabla */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Por área (detalle)</h3>
          <span className="text-xs text-gray-500">Mostrando <b>{data.byArea.length}</b> áreas</span>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr className="bg-gray-50">
                <ThSortable label="Área" sortKey="area" sort={sort} dir={dir} onSort={handleSort} />
                <ThSortable label="Pend. Jefe" sortKey="pendiente_jefe" sort={sort} dir={dir} onSort={handleSort} />
                <ThSortable label="Pend. Secretario" sortKey="pendiente_secretario" sort={sort} dir={dir} onSort={handleSort} />
                <ThSortable label="Aprobadas" sortKey="aprobada" sort={sort} dir={dir} onSort={handleSort} />
                <ThSortable label="Rechazadas" sortKey="rechazada" sort={sort} dir={dir} onSort={handleSort} />
                <ThSortable label="Total" sortKey="total" sort={sort} dir={dir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.byArea.map((r) => (
                <tr key={r.area} className="odd:bg-gray-50/50 hover:bg-gray-50 transition">
                  <td className="py-2 pr-4 font-medium">{r.area}</td>
                  <td className="py-2 pr-4">
                    <DataBarCell value={num(r.pendiente_jefe)} total={num(r.total)} color="bg-amber-500" />
                  </td>
                  <td className="py-2 pr-4">
                    <DataBarCell value={num(r.pendiente_secretario)} total={num(r.total)} color="bg-blue-500" />
                  </td>
                  <td className="py-2 pr-4">
                    <DataBarCell value={num(r.aprobada)} total={num(r.total)} color="bg-emerald-500" />
                  </td>
                  <td className="py-2 pr-4">
                    <DataBarCell value={num(r.rechazada)} total={num(r.total)} color="bg-rose-500" />
                  </td>
                  <td className="py-2 pr-4 font-semibold">{num(r.total)}</td>
                </tr>
              ))}
              {data.byArea.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No hay datos para este filtro
                  </td>
                </tr>
              )}
            </tbody>

            {data.byArea.length > 0 && (
              <tfoot className="bg-gray-50/60">
                <tr>
                  <td className="py-2 pr-4 font-semibold">Totales</td>
                  <td className="py-2 pr-4">{num(T.pendiente_jefe)}</td>
                  <td className="py-2 pr-4">{num(T.pendiente_secretario)}</td>
                  <td className="py-2 pr-4">{num(T.aprobada)}</td>
                  <td className="py-2 pr-4">{num(T.rechazada)}</td>
                  <td className="py-2 pr-4 font-semibold">{total}</td>
                </tr>
              </tfoot>
            )}
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

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr className="bg-gray-50">
                <ThSortable label="ID" sortKey="id" sort={sort} dir={dir} onSort={handleSort} />
                <ThSortable label="Empleado" sortKey="empleado" sort={sort} dir={dir} onSort={handleSort} />
                <ThSortable label="Área" sortKey="area" sort={sort} dir={dir} onSort={handleSort} />
                <ThSortable label="Motivo" sortKey="motivo" sort={sort} dir={dir} onSort={handleSort} />
                <ThSortable label="Estado" sortKey="estado" sort={sort} dir={dir} onSort={handleSort} />
                <ThSortable label="Fecha" sortKey="fecha" sort={sort} dir={dir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((s) => (
                <tr key={s.id} className="odd:bg-gray-50/50 hover:bg-gray-50 transition">
                  <td className="py-2 pr-4">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => navigate(`/solicitudes/${s.id}`)}
                      title={`Ver solicitud #${s.id}`}
                    >
                      #{s.id}
                    </button>
                  </td>
                  <td className="py-2 pr-4" title={s.nombre || s.usuario?.nombre || "—"}>
                    {s.nombre || s.usuario?.nombre || "—"}
                  </td>
                  <td className="py-2 pr-4" title={s.dependencia?.nombre || "—"}>
                    {s.dependencia?.nombre || "—"}
                  </td>
                  <td className="py-2 pr-4 truncate max-w-[260px]" title={(s.motivo || renderTipo(s)) || "—"}>
                    {(s.motivo || renderTipo(s)) || "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <EstadoPill
                      estado={s.estado}
                      onClick={() => onToggleEstado(s.estado)}
                      active={estado.includes(s.estado)}
                    />
                  </td>
                  <td className="py-2 pr-4">{fmt(s.fecha)}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <div className="text-gray-500">No hay solicitudes que coincidan con el filtro</div>
                    <button
                      onClick={clearFilters}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-xs"
                    >
                      <RotateCcw size={14} /> Limpiar filtros
                    </button>
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

            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.pages || 1 }).slice(0, 7).map((_, idx) => {
                const n = idx + 1;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={classNames(
                      "min-w-8 h-8 px-2 rounded-md border text-xs",
                      n === pagination.page
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white hover:bg-gray-50"
                    )}
                  >
                    {n}
                  </button>
                );
              })}
              {pagination.pages > 7 && <span className="px-1">…</span>}
            </div>

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

/* =========================
   Helpers de datos
   ========================= */

function fmt(d) { return d ? new Date(d).toLocaleString() : "—"; }
function renderTipo(s) {
  const arr = [];
  if (s.estudios) arr.push("Estudios");
  if (s.cita_medica) arr.push("Cita médica");
  if (s.licencia) arr.push("Licencia");
  if (s.compensatorio) arr.push("Compensatorio");
  if (s.otro) arr.push("Otro");
  return arr.join(", ");
}
