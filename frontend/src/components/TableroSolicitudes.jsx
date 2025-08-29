// src/components/TableroSolicitudes.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { BarChart2, Clock, Shield, CheckCircle2, XCircle } from "lucide-react";

export default function TableroSolicitudes() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const rol = (localStorage.getItem("rol") || "").toLowerCase();

  useEffect(() => {
    if (!["jefe", "secretario"].includes(rol)) {
      navigate("/mis-solicitudes", { replace: true });
      return;
    }
    (async () => {
      try {
        const { data } = await api.get("/solicitudes/board");
        setData(data);
      } catch (e) {
        setErr(e?.response?.data?.error || "No se pudo cargar el tablero");
      } finally {
        setLoading(false);
      }
    })();
  }, [rol, navigate]);

  if (loading) return <SkeletonTablero />;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!data) return null;

  const T = data.totals || {};
  const total = (T.pendiente_jefe || 0) + (T.pendiente_secretario || 0) + (T.aprobada || 0) + (T.rechazada || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <BarChart2 size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tablero de Solicitudes</h1>
            <p className="text-sm text-gray-500">Vista consolidada por estado y área</p>
          </div>
          <span className="ml-auto text-xs text-gray-600">
            Rol:&nbsp;<b className="uppercase">{rol}</b>
          </span>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          title="Pendiente Jefe"
          value={T.pendiente_jefe || 0}
          accent="from-amber-50 to-amber-100"
          ring="ring-amber-200"
          icon={<Clock className="opacity-80" size={18} />}
        />
        <Kpi
          title="Pendiente Secretario"
          value={T.pendiente_secretario || 0}
          accent="from-blue-50 to-blue-100"
          ring="ring-blue-200"
          icon={<Shield className="opacity-80" size={18} />}
        />
        <Kpi
          title="Aprobadas"
          value={T.aprobada || 0}
          accent="from-emerald-50 to-emerald-100"
          ring="ring-emerald-200"
          icon={<CheckCircle2 className="opacity-80" size={18} />}
        />
        <Kpi
          title="Rechazadas"
          value={T.rechazada || 0}
          accent="from-rose-50 to-rose-100"
          ring="ring-rose-200"
          icon={<XCircle className="opacity-80" size={18} />}
        />
      </div>

      {/* Distribución por estado */}
      <Card title="Distribución por estado" subtitle={total ? `${total} total` : ""}>
        <FancyBarChart totals={T} total={total} />
        <Legend />
      </Card>

      {/* Doble panel: Por área + Tabla */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Por área">
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
                <tr>
                  <Th>Área</Th>
                  <Th>Pend. Jefe</Th>
                  <Th>Pend. Secretario</Th>
                  <Th>Aprobadas</Th>
                  <Th>Rechazadas</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.byArea.map((r) => (
                  <tr key={r.area} className="odd:bg-gray-50/40 hover:bg-gray-50/80">
                    <Td className="font-medium">{r.area}</Td>
                    <Td>{r.pendiente_jefe || 0}</Td>
                    <Td>{r.pendiente_secretario || 0}</Td>
                    <Td>{r.aprobada || 0}</Td>
                    <Td>{r.rechazada || 0}</Td>
                    <Td className="font-semibold">{r.total || 0}</Td>
                  </tr>
                ))}
                {data.byArea.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      Sin registros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={`Solicitudes (${data.items.length})`}>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
                <tr>
                  <Th>ID</Th>
                  <Th>Empleado</Th>
                  <Th>Área</Th>
                  <Th>Motivo</Th>
                  <Th>Estado</Th>
                  <Th>Fecha</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((s) => (
                  <tr key={s.id} className="odd:bg-gray-50/40 hover:bg-gray-50/80">
                    <Td>
                      <button
                        className="text-blue-600 underline-offset-2 hover:underline"
                        onClick={() => navigate(`/solicitudes/${s.id}`)}
                      >
                        #{s.id}
                      </button>
                    </Td>
                    <Td>{s.nombre_completo || s.usuario?.nombre || "—"}</Td>
                    <Td>{s.dependencia?.nombre || "—"}</Td>
                    <Td className="truncate max-w-[260px]">{(s.motivo || renderTipo(s)) || "—"}</Td>
                    <Td>
                      <EstadoPill estado={s.estado} />
                    </Td>
                    <Td>{fmt(s.fecha)}</Td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      Sin registros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------- UI helpers -------------------------- */

function SkeletonTablero() {
  return (
    <div className="space-y-6 p-2">
      <div className="h-24 rounded-2xl border bg-white shadow-sm" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-60 animate-pulse rounded-2xl border bg-white shadow-sm" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl border bg-white shadow-sm" />
        <div className="h-72 animate-pulse rounded-2xl border bg-white shadow-sm" />
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Kpi({ title, value, icon, accent = "from-gray-50 to-gray-100", ring = "ring-gray-200" }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ring-1 ${ring} bg-gradient-to-br ${accent}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-600">{title}</p>
        <span className="inline-flex items-center justify-center rounded-full bg-white/70 p-1.5 shadow-sm">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
    </div>
  );
}

function Th({ children }) {
  return <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide">{children}</th>;
}
function Td({ className = "", children }) {
  return <td className={`py-2.5 pr-4 align-top text-gray-700 ${className}`}>{children}</td>;
}

function EstadoPill({ estado }) {
  const map = {
    pendiente_jefe: "bg-amber-50 text-amber-800 ring-amber-200",
    pendiente_secretario: "bg-blue-50 text-blue-800 ring-blue-200",
    aprobada: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    rechazada: "bg-rose-50 text-rose-800 ring-rose-200",
  };
  const cls = map[estado] || "bg-gray-50 text-gray-700 ring-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>
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

/* ----------------------- Chart (CSS only) ----------------------- */

function FancyBarChart({ totals, total }) {
  const items = [
    { key: "pendiente_jefe", label: "Pend. Jefe", bar: "bg-amber-500" },
    { key: "pendiente_secretario", label: "Pend. Secretario", bar: "bg-blue-500" },
    { key: "aprobada", label: "Aprobada", bar: "bg-emerald-500" },
    { key: "rechazada", label: "Rechazada", bar: "bg-rose-500" },
  ];
  const maxVal = Math.max(...items.map((i) => totals[i.key] || 0), 1);

  return (
    <div className="grid grid-cols-4 items-end gap-6 sm:gap-8">
      {items.map((i) => {
        const v = totals[i.key] || 0;
        const h = Math.round((v / maxVal) * 100);
        const pct = total ? Math.round((v / total) * 100) : 0;

        return (
          <div key={i.key} className="flex flex-col items-center">
            <div className="relative w-12 sm:w-14">
              {/* Track */}
              <div className="h-44 w-full rounded-lg bg-gray-100 ring-1 ring-gray-200" />
              {/* Bar */}
              <div
                className={`absolute bottom-0 left-0 w-full rounded-lg ${i.bar} shadow-sm transition-[height] duration-500`}
                style={{ height: `${h}%` }}
                title={`${i.label}: ${v} (${pct}%)`}
              />
            </div>
            <div className="mt-2 text-center text-xs text-gray-600">
              <div className="font-semibold">{v}</div>
              <div className="opacity-80">{i.label}</div>
              {total > 0 && <div className="text-[10px] text-gray-500">{pct}%</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Legend() {
  const dots = [
    { c: "bg-amber-500", t: "Pend. Jefe" },
    { c: "bg-blue-500", t: "Pend. Secretario" },
    { c: "bg-emerald-500", t: "Aprobadas" },
    { c: "bg-rose-500", t: "Rechazadas" },
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
      {dots.map((d) => (
        <span key={d.t} className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${d.c}`} />
          {d.t}
        </span>
      ))}
    </div>
  );
}
