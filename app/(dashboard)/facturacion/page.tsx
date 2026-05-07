import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCOP } from "@/lib/format";
import FacturacionTable from "./_components/facturacion-table";

export type SesionFacturacion = {
  id: string;
  fecha: string;
  estado_pago: "pagado" | "pendiente";
  monto: number | null;
  cs_id: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_documento: string | null;
  servicio_id: string;
  servicio_nombre: string;
  esteticista_nombre: string | null;
};

function inicioDeMes(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default async function FacturacionPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();
    if (profile?.rol === "esteticista") redirect("/");
  }

  // Sesiones con joins (cliente + servicio + esteticista)
  const { data: rows } = await supabase
    .from("sesiones")
    .select(
      `
      id,
      fecha,
      estado_pago,
      monto,
      cliente_servicio:cliente_servicio_id (
        id,
        cliente:cliente_id ( id, nombre_completo, documento ),
        servicio:servicio_id ( id, nombre )
      ),
      esteticista:realizada_por ( nombre )
    `
    )
    .order("fecha", { ascending: false });

  const sesiones: SesionFacturacion[] = (rows ?? [])
    .map((row) => {
      const cs = Array.isArray(row.cliente_servicio)
        ? row.cliente_servicio[0]
        : row.cliente_servicio;
      if (!cs) return null;
      const cliente = Array.isArray(cs.cliente) ? cs.cliente[0] : cs.cliente;
      const servicio = Array.isArray(cs.servicio) ? cs.servicio[0] : cs.servicio;
      if (!cliente || !servicio) return null;
      const est = Array.isArray(row.esteticista) ? row.esteticista[0] : row.esteticista;
      return {
        id: row.id,
        fecha: row.fecha,
        estado_pago: row.estado_pago as SesionFacturacion["estado_pago"],
        monto: row.monto != null ? Number(row.monto) : null,
        cs_id: cs.id,
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre_completo,
        cliente_documento: cliente.documento,
        servicio_id: servicio.id,
        servicio_nombre: servicio.nombre,
        esteticista_nombre: est?.nombre ?? null,
      };
    })
    .filter((x): x is SesionFacturacion => x !== null);

  // KPIs del mes en curso
  const inicio = inicioDeMes();
  const sesionesMes = sesiones.filter((s) => s.fecha >= inicio);
  const cobradoMes = sesionesMes
    .filter((s) => s.estado_pago === "pagado")
    .reduce((acc, s) => acc + (s.monto ?? 0), 0);
  const pendienteMes = sesionesMes
    .filter((s) => s.estado_pago === "pendiente")
    .reduce((acc, s) => acc + (s.monto ?? 0), 0);
  const pendienteTotal = sesiones
    .filter((s) => s.estado_pago === "pendiente")
    .reduce((acc, s) => acc + (s.monto ?? 0), 0);

  return (
    <div>
      <header className="mb-10">
        <span className="block text-[14px] tracking-[0.16em] uppercase text-gold font-light italic mb-1 font-cormorant">
          Resumen de
        </span>
        <h1 className="font-cormorant text-[44px] font-light text-turquesa-dark leading-tight">
          Facturación
        </h1>
        <p className="text-ink-soft text-[15px] font-light mt-2">
          Sesiones cobradas y pendientes de pago.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <KPI
          label="Cobrado este mes"
          value={formatCOP(cobradoMes)}
          subtitle={`${sesionesMes.filter((s) => s.estado_pago === "pagado").length} sesiones pagadas`}
          accent="turquesa"
        />
        <KPI
          label="Pendiente este mes"
          value={formatCOP(pendienteMes)}
          subtitle={`${sesionesMes.filter((s) => s.estado_pago === "pendiente").length} sesiones por cobrar`}
          accent="gold"
        />
        <KPI
          label="Pendiente histórico"
          value={formatCOP(pendienteTotal)}
          subtitle={`${sesiones.filter((s) => s.estado_pago === "pendiente").length} sesiones acumuladas`}
          accent="rosa"
        />
      </section>

      <FacturacionTable sesiones={sesiones} />
    </div>
  );
}

function KPI({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: string;
  subtitle: string;
  accent: "turquesa" | "gold" | "rosa";
}) {
  const accentColor =
    accent === "turquesa"
      ? "text-turquesa"
      : accent === "gold"
      ? "text-gold-dark"
      : "text-rosa";
  const accentBar =
    accent === "turquesa" ? "bg-turquesa" : accent === "gold" ? "bg-gold" : "bg-rosa";

  return (
    <div className="bg-white rounded-2xl border border-line-soft p-6 relative overflow-hidden shadow-sm">
      <span className={`absolute top-0 left-0 right-0 h-[3px] ${accentBar}`} />
      <div className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium mb-2">
        {label}
      </div>
      <div className={`font-cormorant text-[36px] font-light leading-none ${accentColor}`}>
        {value}
      </div>
      <div className="text-[12px] text-ink-soft font-light mt-2">{subtitle}</div>
    </div>
  );
}
