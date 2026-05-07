import { createClient } from "@/lib/supabase/server";
import AgendaCalendar from "./_components/agenda-calendar";

export type Cita = {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  servicio_id: string | null;
  servicio_nombre: string | null;
  servicio_categoria: string | null;
  asignada_a: string | null;
  asignada_nombre: string | null;
  fecha_hora: string;
  duracion_minutos: number;
  estado: "agendada" | "realizada" | "cancelada";
  notas: string | null;
};

export type AgendaServicio = {
  id: string;
  nombre: string;
  categoria: string;
};

export type AgendaCliente = {
  id: string;
  nombre_completo: string;
  documento: string | null;
};

export type AgendaPerfil = {
  id: string;
  nombre: string;
  rol: string;
};

function parseMes(mes: string | undefined): { year: number; month: number } {
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    if (y >= 2020 && y <= 2035 && m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const { year, month } = parseMes(mes);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, nombre")
    .eq("id", user!.id)
    .single();

  const esAdmin = perfil?.rol === "admin";
  const userId  = user!.id;

  // Rango del mes ± margen para overflow del calendario
  const inicio = new Date(year, month, -6);
  const fin    = new Date(year, month + 1, 7, 23, 59, 59);

  let query = supabase
    .from("citas_agendadas")
    .select(`
      id,
      cliente_id,
      servicio_id,
      asignada_a,
      fecha_hora,
      duracion_minutos,
      estado,
      notas,
      cliente:cliente_id ( nombre_completo ),
      servicio:servicio_id ( nombre, categoria ),
      asignado:asignada_a ( nombre )
    `)
    .gte("fecha_hora", inicio.toISOString())
    .lte("fecha_hora", fin.toISOString())
    .order("fecha_hora", { ascending: true });

  // Esteticista: solo ve sus citas
  if (!esAdmin) {
    query = query.eq("asignada_a", userId) as typeof query;
  }

  const { data: citasRaw } = await query;

  const citas: Cita[] = (citasRaw ?? []).map((row) => {
    const cliente  = Array.isArray(row.cliente)   ? row.cliente[0]   : row.cliente;
    const servicio = Array.isArray(row.servicio)  ? row.servicio[0]  : row.servicio;
    const asignado = Array.isArray(row.asignado)  ? row.asignado[0]  : row.asignado;
    return {
      id:                  row.id,
      cliente_id:          row.cliente_id,
      cliente_nombre:      cliente?.nombre_completo ?? "—",
      servicio_id:         row.servicio_id,
      servicio_nombre:     servicio?.nombre ?? null,
      servicio_categoria:  servicio?.categoria ?? null,
      asignada_a:          row.asignada_a,
      asignada_nombre:     asignado?.nombre ?? null,
      fecha_hora:          row.fecha_hora,
      duracion_minutos:    row.duracion_minutos,
      estado:              row.estado as Cita["estado"],
      notas:               row.notas,
    };
  });

  // Servicios y clientes para el formulario de nueva cita
  const [{ data: serviciosRaw }, { data: clientasRaw }, { data: perfilesRaw }] = await Promise.all([
    supabase.from("servicios").select("id, nombre, categoria").eq("activo", true).order("orden"),
    supabase.from("clientes").select("id, nombre_completo, documento").order("nombre_completo"),
    supabase.from("profiles").select("id, nombre, rol").eq("activo", true).order("nombre"),
  ]);

  const servicios: AgendaServicio[] = (serviciosRaw ?? []).map((s) => ({
    id: s.id, nombre: s.nombre, categoria: s.categoria,
  }));

  const clientas: AgendaCliente[] = (clientasRaw ?? []).map((c) => ({
    id: c.id, nombre_completo: c.nombre_completo, documento: c.documento,
  }));

  const perfiles: AgendaPerfil[] = (perfilesRaw ?? []).map((p) => ({
    id: p.id, nombre: p.nombre, rol: p.rol,
  }));

  return (
    <div>
      <header className="mb-10">
        <span className="block text-[14px] tracking-[0.16em] uppercase text-gold font-light italic mb-1 font-cormorant">
          {esAdmin ? "Agenda de la estética" : "Mi agenda"}
        </span>
        <h1 className="font-cormorant text-[44px] font-light text-turquesa-dark leading-tight">
          Agenda
        </h1>
        <p className="text-ink-soft text-[15px] font-light mt-2">
          {esAdmin
            ? "Todas las citas — esteticistas y administración."
            : "Tus citas programadas."}
        </p>
      </header>

      <AgendaCalendar
        citas={citas}
        servicios={servicios}
        clientas={clientas}
        perfiles={perfiles}
        year={year}
        month={month}
        esAdmin={esAdmin}
        userId={userId}
      />
    </div>
  );
}
