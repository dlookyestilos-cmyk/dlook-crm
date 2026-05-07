import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import ClientasManager from "./_components/clientas-manager";

type ServicioRow = {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string | null;
  precio_sesion: number | null;
};

type LineaRow = {
  slug: string;
  nombre: string;
};

type ClientaRow = {
  cs_id: string;
  cliente_id: string;
  nombre_completo: string;
  documento: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
  gustos_preferencias: string | null;
  notas_generales: string | null;
  areas_tratadas: string[];
  sesiones_totales: number;
  sesiones_completadas: number;
  estado: "activo" | "pausado" | "completado";
  notas_tratamiento: string | null;
  fecha_inicio: string;
};

export default async function ServicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user!.id)
    .single();
  const rol = (profile?.rol ?? "esteticista") as "admin" | "esteticista";

  const { data: servicio } = await supabase
    .from("servicios")
    .select("id, nombre, categoria, descripcion, precio_sesion")
    .eq("id", id)
    .single<ServicioRow>();

  if (!servicio) notFound();

  const { data: linea } = await supabase
    .from("lineas")
    .select("slug, nombre")
    .eq("slug", servicio.categoria)
    .single<LineaRow>();

  // Clientas asociadas a este servicio
  const { data: clientasRaw } = await supabase
    .from("cliente_servicio")
    .select(
      `
      id,
      areas_tratadas,
      sesiones_totales,
      sesiones_completadas,
      estado,
      notas_tratamiento,
      fecha_inicio,
      cliente:cliente_id (
        id,
        nombre_completo,
        documento,
        telefono,
        email,
        direccion,
        fecha_nacimiento,
        gustos_preferencias,
        notas_generales
      )
    `
    )
    .eq("servicio_id", id)
    .order("fecha_inicio", { ascending: false });

  const clientas: ClientaRow[] = (clientasRaw ?? [])
    .map((row) => {
      // El embed de Supabase puede tipar como array; tomamos el primero.
      const cliente = Array.isArray(row.cliente) ? row.cliente[0] : row.cliente;
      if (!cliente) return null;
      return {
        cs_id: row.id,
        cliente_id: cliente.id,
        nombre_completo: cliente.nombre_completo,
        documento: cliente.documento,
        telefono: cliente.telefono,
        email: cliente.email,
        direccion: cliente.direccion,
        fecha_nacimiento: cliente.fecha_nacimiento,
        gustos_preferencias: cliente.gustos_preferencias,
        notas_generales: cliente.notas_generales,
        areas_tratadas: row.areas_tratadas ?? [],
        sesiones_totales: row.sesiones_totales,
        sesiones_completadas: row.sesiones_completadas,
        estado: row.estado as ClientaRow["estado"],
        notas_tratamiento: row.notas_tratamiento,
        fecha_inicio: row.fecha_inicio,
      };
    })
    .filter((x): x is ClientaRow => x !== null);

  const activas = clientas.filter((c) => c.estado === "activo").length;
  const pausadas = clientas.filter((c) => c.estado === "pausado").length;
  const completas = clientas.filter((c) => c.estado === "completado").length;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2.5 text-[12px] tracking-[0.05em] uppercase text-ink-mute mb-6">
        <Link href="/" className="hover:text-gold transition">Servicios</Link>
        <ChevronRight className="w-3.5 h-3.5 text-line" strokeWidth={1.5} />
        <span className="text-turquesa-dark font-normal normal-case tracking-normal">
          {servicio.nombre}
        </span>
      </nav>

      {/* Header */}
      <header className="mb-10">
        <span className="block text-[14px] tracking-[0.16em] uppercase text-gold font-light italic mb-1 font-cormorant">
          Clientas en
        </span>
        <h1 className="font-cormorant text-[40px] font-light text-turquesa-dark leading-tight mb-2">
          {servicio.nombre}
        </h1>
        <p className="text-ink-soft text-[14px] font-light">
          {clientas.length === 0 ? (
            <>Aún no hay clientas registradas en este servicio.</>
          ) : (
            <>
              {activas} {activas === 1 ? "activa" : "activas"} ·{" "}
              {pausadas} {pausadas === 1 ? "pausada" : "pausadas"} ·{" "}
              {completas} {completas === 1 ? "completada" : "completadas"}
            </>
          )}
        </p>
      </header>

      {/* Manager (client component): toolbar + tabla + drawers */}
      <ClientasManager
        servicioId={servicio.id}
        servicioNombre={servicio.nombre}
        lineaNombre={linea?.nombre ?? servicio.categoria}
        precioSesion={servicio.precio_sesion}
        clientas={clientas}
        rol={rol}
      />
    </div>
  );
}
