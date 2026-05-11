import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCOP } from "@/lib/format";
import MesSelector from "./_components/mes-selector";

/* ── Helpers de fecha ────────────────────────────────────── */

const MESES_CORTOS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_LARGOS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function parseMes(mes: string | undefined): { year: number; month: number } {
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    if (y >= 2020 && y <= 2035 && m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function ultimos6(year: number, month: number) {
  return Array.from({ length: 6 }, (_, i) => {
    let m = month - (5 - i);
    let y = year;
    while (m < 0) { m += 12; y--; }
    const lastDay = new Date(y, m + 1, 0).getDate(); // último día del mes
    return {
      year: y, month: m,
      label:    MESES_CORTOS[m],
      desde:    fmtDate(y, m, 1),
      hasta:    fmtDate(y, m, lastDay),
      esActual: m === month && y === year,
    };
  });
}

/* ── Tipos internos ──────────────────────────────────────── */

type SesionFlat = {
  fecha: string;
  monto: number;
  estado_pago: "pagado" | "pendiente";
  servicio_nombre: string;
  esteticista_nombre: string;
};

/* ── Componentes visuales ────────────────────────────────── */

function KPI({ label, value, sub, accent = "turquesa" }: {
  label: string; value: string; sub: string; accent?: "turquesa" | "gold" | "rosa";
}) {
  const bar = accent === "turquesa" ? "bg-turquesa" : accent === "gold" ? "bg-gold" : "bg-rosa";
  const txt = accent === "turquesa" ? "text-turquesa" : accent === "gold" ? "text-gold-dark" : "text-rosa";
  return (
    <div className="bg-white rounded-2xl border border-line-soft p-6 relative overflow-hidden shadow-sm">
      <span className={`absolute top-0 left-0 right-0 h-[3px] ${bar}`} />
      <div className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium mb-2">{label}</div>
      <div className={`font-cormorant text-[34px] font-light leading-none ${txt}`}>{value}</div>
      <div className="text-[12px] text-ink-soft font-light mt-2">{sub}</div>
    </div>
  );
}

function BarraH({ valor, max, color = "bg-turquesa" }: { valor: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex-1 h-2 bg-crema-deep rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function GraficoBarrasV({ data }: {
  data: Array<{ label: string; cobrado: number; pendiente: number; esActual: boolean }>;
}) {
  const maxVal = Math.max(...data.map((d) => d.cobrado + d.pendiente), 1);
  const ALTO = 140;
  return (
    <div className="w-full">
      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-4 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-turquesa inline-block" /> Cobrado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gold inline-block" /> Pendiente</span>
      </div>
      <div className="flex items-end gap-2" style={{ height: `${ALTO + 24}px` }}>
        {data.map((d) => {
          const total = d.cobrado + d.pendiente;
          const totalH = Math.round((total / maxVal) * ALTO);
          const cobradoH = total > 0 ? Math.round((d.cobrado / total) * totalH) : 0;
          const pendienteH = totalH - cobradoH;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full flex flex-col justify-end gap-px"
                style={{ height: `${ALTO}px` }}
              >
                <div
                  className={`w-full rounded-t-sm ${d.esActual ? "bg-gold" : "bg-gold/50"}`}
                  style={{ height: `${pendienteH}px`, minHeight: pendienteH > 0 ? "2px" : "0" }}
                />
                <div
                  className={`w-full ${d.esActual ? "bg-turquesa" : "bg-turquesa/50"}`}
                  style={{ height: `${cobradoH}px`, minHeight: cobradoH > 0 ? "2px" : "0" }}
                />
              </div>
              <div className={`text-[10px] ${d.esActual ? "font-medium text-turquesa-dark" : "text-ink-mute"}`}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GraficoClientas({ data }: { data: Array<{ label: string; count: number; esActual: boolean }> }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const ALTO = 100;
  return (
    <div className="flex items-end gap-2" style={{ height: `${ALTO + 24}px` }}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col justify-end" style={{ height: `${ALTO}px` }}>
            <div
              className={`w-full rounded-t-sm ${d.esActual ? "bg-turquesa" : "bg-turquesa/50"}`}
              style={{ height: `${Math.max(Math.round((d.count / maxVal) * ALTO), d.count > 0 ? 3 : 0)}px` }}
            />
          </div>
          <div className={`text-[10px] ${d.esActual ? "font-medium text-turquesa-dark" : "text-ink-mute"}`}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function SeccionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-6 bg-gold rounded-full" />
      <h2 className="font-cormorant text-[26px] font-light text-turquesa-dark leading-none">{children}</h2>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const supabase = await createClient();

  // Solo admin
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
    if (profile?.rol === "esteticista") redirect("/");
  }

  const { mes: mesParam } = await searchParams;
  const { year, month } = parseMes(mesParam);
  const meses6 = ultimos6(year, month);

  // Rango de 6 meses para traer todo de una sola vez
  const fechaMin = meses6[0].desde;
  const fechaMax = meses6[5].hasta;
  const { desde, hasta } = { desde: meses6[5].desde, hasta: meses6[5].hasta };

  // ── Query: sesiones de los últimos 6 meses ──
  const { data: rawSesiones } = await supabase
    .from("sesiones")
    .select(`
      fecha, monto, estado_pago,
      cliente_servicio:cliente_servicio_id (
        servicio:servicio_id ( nombre )
      ),
      esteticista:realizada_por ( nombre )
    `)
    .gte("fecha", fechaMin)
    .lte("fecha", fechaMax);

  // Aplanar
  const sesiones: SesionFlat[] = (rawSesiones ?? []).map((row) => {
    const cs  = Array.isArray(row.cliente_servicio) ? row.cliente_servicio[0] : row.cliente_servicio;
    const svc = cs ? (Array.isArray(cs.servicio) ? cs.servicio[0] : cs.servicio) : null;
    const est = Array.isArray(row.esteticista) ? row.esteticista[0] : row.esteticista;
    return {
      fecha:            row.fecha,
      monto:            row.monto != null ? Number(row.monto) : 0,
      estado_pago:      row.estado_pago as "pagado" | "pendiente",
      servicio_nombre:  svc?.nombre ?? "Sin servicio",
      esteticista_nombre: est?.nombre ?? "Sin asignar",
    };
  });

  // ── Query: clientas de los últimos 6 meses ──
  const { data: clientasRecientes } = await supabase
    .from("clientes")
    .select("id, created_at")
    .gte("created_at", fechaMin + "T00:00:00")
    .lte("created_at", fechaMax + "T23:59:59");

  // ── Query: estados de tratamientos (todos) ──
  const { data: tratamientos } = await supabase
    .from("cliente_servicio")
    .select("estado");

  /* ── Sección 1: Ingresos ── */
  const sesionesDelMes = sesiones.filter((s) => s.fecha >= desde && s.fecha <= hasta);
  const cobradoMes = sesionesDelMes.filter((s) => s.estado_pago === "pagado").reduce((a, s) => a + s.monto, 0);
  const pendienteMes = sesionesDelMes.filter((s) => s.estado_pago === "pendiente").reduce((a, s) => a + s.monto, 0);
  const nCobradas   = sesionesDelMes.filter((s) => s.estado_pago === "pagado").length;
  const nPendientes = sesionesDelMes.filter((s) => s.estado_pago === "pendiente").length;

  const graficoIngresos = meses6.map((m) => {
    const ss = sesiones.filter((s) => s.fecha >= m.desde && s.fecha <= m.hasta);
    return {
      label:     m.label,
      cobrado:   ss.filter((s) => s.estado_pago === "pagado").reduce((a, s) => a + s.monto, 0),
      pendiente: ss.filter((s) => s.estado_pago === "pendiente").reduce((a, s) => a + s.monto, 0),
      esActual:  m.esActual,
    };
  });

  /* ── Sección 2: Por servicio ── */
  const porServicioMap = new Map<string, { sesiones: number; cobrado: number; pendiente: number }>();
  for (const s of sesionesDelMes) {
    const prev = porServicioMap.get(s.servicio_nombre) ?? { sesiones: 0, cobrado: 0, pendiente: 0 };
    prev.sesiones++;
    if (s.estado_pago === "pagado") prev.cobrado += s.monto;
    else prev.pendiente += s.monto;
    porServicioMap.set(s.servicio_nombre, prev);
  }
  const porServicio = [...porServicioMap.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => (b.cobrado + b.pendiente) - (a.cobrado + a.pendiente));
  const maxServicio = Math.max(...porServicio.map((s) => s.cobrado + s.pendiente), 1);

  /* ── Sección 3: Por esteticista ── */
  const porEstMap = new Map<string, { sesiones: number; cobrado: number; pendiente: number }>();
  for (const s of sesionesDelMes) {
    const prev = porEstMap.get(s.esteticista_nombre) ?? { sesiones: 0, cobrado: 0, pendiente: 0 };
    prev.sesiones++;
    if (s.estado_pago === "pagado") prev.cobrado += s.monto;
    else prev.pendiente += s.monto;
    porEstMap.set(s.esteticista_nombre, prev);
  }
  const porEsteticista = [...porEstMap.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.sesiones - a.sesiones);
  const maxEst = Math.max(...porEsteticista.map((e) => e.cobrado + e.pendiente), 1);

  /* ── Sección 4: Clientas ── */
  const nuevasEsteMes = (clientasRecientes ?? []).filter(
    (c) => c.created_at >= desde + "T00:00:00" && c.created_at <= hasta + "T23:59:59"
  ).length;

  const graficoClientas = meses6.map((m) => ({
    label: m.label,
    count: (clientasRecientes ?? []).filter(
      (c) => c.created_at >= m.desde + "T00:00:00" && c.created_at <= m.hasta + "T23:59:59"
    ).length,
    esActual: m.esActual,
  }));

  const nActivos    = (tratamientos ?? []).filter((t) => t.estado === "activo").length;
  const nCompletados = (tratamientos ?? []).filter((t) => t.estado === "completado").length;
  const nPausados   = (tratamientos ?? []).filter((t) => t.estado === "pausado").length;

  return (
    <div>
      {/* Header */}
      <header className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <span className="block text-[14px] tracking-[0.16em] uppercase text-gold font-light italic mb-1 font-cormorant">
            Resumen de
          </span>
          <h1 className="font-cormorant text-[44px] font-light text-turquesa-dark leading-tight">
            Reportes
          </h1>
          {/* Titulo para print */}
          <p className="hidden print:block text-[13px] text-ink-soft mt-1">
            {MESES_LARGOS[month]} {year}
          </p>
        </div>
        <MesSelector year={year} month={month} />
      </header>

      <div className="space-y-12">
        {/* ══════════════════════════════════════════
            SECCIÓN 1: INGRESOS
        ══════════════════════════════════════════ */}
        <section>
          <SeccionTitle>Ingresos</SeccionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <KPI
              label="Cobrado este mes"
              value={formatCOP(cobradoMes)}
              sub={`${nCobradas} ${nCobradas === 1 ? "sesión pagada" : "sesiones pagadas"}`}
              accent="turquesa"
            />
            <KPI
              label="Pendiente este mes"
              value={formatCOP(pendienteMes)}
              sub={`${nPendientes} ${nPendientes === 1 ? "sesión por cobrar" : "sesiones por cobrar"}`}
              accent="gold"
            />
            <KPI
              label="Total facturado"
              value={formatCOP(cobradoMes + pendienteMes)}
              sub={`${sesionesDelMes.length} ${sesionesDelMes.length === 1 ? "sesión" : "sesiones"} en total`}
              accent="rosa"
            />
          </div>
          <div className="bg-white rounded-2xl border border-line-soft p-6 shadow-sm">
            <div className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium mb-5">
              Últimos 6 meses
            </div>
            <GraficoBarrasV data={graficoIngresos} />
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECCIÓN 2: POR SERVICIO
        ══════════════════════════════════════════ */}
        <section>
          <SeccionTitle>Por servicio</SeccionTitle>
          <div className="bg-white rounded-2xl border border-line-soft shadow-sm overflow-hidden">
            {porServicio.length === 0 ? (
              <div className="px-6 py-10 text-center text-ink-mute text-[14px] italic">
                Sin sesiones registradas este mes.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line-soft bg-crema">
                    <th className="text-left px-6 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium">Servicio</th>
                    <th className="text-right px-4 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium">Sesiones</th>
                    <th className="text-right px-4 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium hidden md:table-cell">Cobrado</th>
                    <th className="text-right px-4 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium hidden md:table-cell">Pendiente</th>
                    <th className="px-6 py-3.5 hidden md:table-cell" />
                  </tr>
                </thead>
                <tbody>
                  {porServicio.map((s) => (
                    <tr key={s.nombre} className="border-t border-line-soft first:border-t-0">
                      <td className="px-6 py-4 text-[13.5px] font-medium text-turquesa-dark">{s.nombre}</td>
                      <td className="px-4 py-4 text-right text-[13px] text-ink-soft">{s.sesiones}</td>
                      <td className="px-4 py-4 text-right text-[13px] text-turquesa hidden md:table-cell">{formatCOP(s.cobrado)}</td>
                      <td className="px-4 py-4 text-right text-[13px] text-gold-dark hidden md:table-cell">{formatCOP(s.pendiente)}</td>
                      <td className="px-6 py-4 hidden md:table-cell w-36">
                        <BarraH valor={s.cobrado + s.pendiente} max={maxServicio} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECCIÓN 3: POR ESTETICISTA
        ══════════════════════════════════════════ */}
        <section>
          <SeccionTitle>Por esteticista</SeccionTitle>
          <div className="bg-white rounded-2xl border border-line-soft shadow-sm overflow-hidden">
            {porEsteticista.length === 0 ? (
              <div className="px-6 py-10 text-center text-ink-mute text-[14px] italic">
                Sin sesiones registradas este mes.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line-soft bg-crema">
                    <th className="text-left px-6 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium">Esteticista</th>
                    <th className="text-right px-4 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium">Sesiones</th>
                    <th className="text-right px-4 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium hidden md:table-cell">Cobrado</th>
                    <th className="text-right px-4 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium hidden md:table-cell">Pendiente</th>
                    <th className="px-6 py-3.5 hidden md:table-cell" />
                  </tr>
                </thead>
                <tbody>
                  {porEsteticista.map((e) => (
                    <tr key={e.nombre} className="border-t border-line-soft first:border-t-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-turquesa text-white flex items-center justify-center text-[11px] font-medium font-cormorant tracking-wider shrink-0">
                            {e.nombre.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("")}
                          </div>
                          <span className="text-[13.5px] font-medium text-turquesa-dark">{e.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-[13px] text-ink-soft">{e.sesiones}</td>
                      <td className="px-4 py-4 text-right text-[13px] text-turquesa hidden md:table-cell">{formatCOP(e.cobrado)}</td>
                      <td className="px-4 py-4 text-right text-[13px] text-gold-dark hidden md:table-cell">{formatCOP(e.pendiente)}</td>
                      <td className="px-6 py-4 hidden md:table-cell w-36">
                        <BarraH valor={e.cobrado + e.pendiente} max={maxEst} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECCIÓN 4: CLIENTAS
        ══════════════════════════════════════════ */}
        <section className="pb-10">
          <SeccionTitle>Clientas</SeccionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <KPI
              label="Nuevas este mes"
              value={String(nuevasEsteMes)}
              sub="clientas registradas"
              accent="turquesa"
            />
            <KPI
              label="Tratamientos activos"
              value={String(nActivos)}
              sub={`${nPausados} pausados`}
              accent="gold"
            />
            <KPI
              label="Tratamientos completados"
              value={String(nCompletados)}
              sub="en toda la historia"
              accent="rosa"
            />
          </div>
          <div className="bg-white rounded-2xl border border-line-soft p-6 shadow-sm">
            <div className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium mb-5">
              Clientas nuevas — últimos 6 meses
            </div>
            <GraficoClientas data={graficoClientas} />
          </div>
        </section>
      </div>
    </div>
  );
}
