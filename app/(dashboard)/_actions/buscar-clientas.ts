"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  cs_id: string | null;
  cliente_id: string;
  nombre: string;
  documento: string | null;
  telefono: string | null;
  servicio_id: string | null;
  servicio_nombre: string | null;
  sesiones_completadas: number;
  sesiones_totales: number;
  estado: "activo" | "pausado" | "completado" | "sin_tratamiento";
  pendiente_datos: boolean;
};

export async function buscarClientas(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();

  const { data: clientes, error: clErr } = await supabase
    .from("clientes")
    .select("id, nombre_completo, documento, telefono, pendiente_datos")
    .or(`nombre_completo.ilike.%${q}%,documento.ilike.%${q}%`)
    .order("nombre_completo")
    .limit(8);

  if (clErr || !clientes || clientes.length === 0) return [];

  const ids = clientes.map((c) => c.id);
  const { data: trats } = await supabase
    .from("cliente_servicio")
    .select(
      `id, cliente_id, sesiones_totales, sesiones_completadas, estado,
       servicio:servicio_id ( id, nombre )`
    )
    .in("cliente_id", ids);

  const out: SearchResult[] = [];

  for (const cliente of clientes) {
    const clienteTrats = (trats ?? []).filter((t) => t.cliente_id === cliente.id);

    if (clienteTrats.length > 0) {
      for (const t of clienteTrats) {
        const servicio = Array.isArray(t.servicio) ? t.servicio[0] : t.servicio;
        if (!servicio) continue;
        out.push({
          cs_id: t.id,
          cliente_id: cliente.id,
          nombre: cliente.nombre_completo,
          documento: cliente.documento,
          telefono: cliente.telefono,
          servicio_id: servicio.id,
          servicio_nombre: servicio.nombre,
          sesiones_completadas: t.sesiones_completadas,
          sesiones_totales: t.sesiones_totales,
          estado: t.estado as "activo" | "pausado" | "completado",
          pendiente_datos: cliente.pendiente_datos ?? false,
        });
      }
    } else {
      // Sin tratamiento activo — incluir igual para poder ir a su ficha
      out.push({
        cs_id: null,
        cliente_id: cliente.id,
        nombre: cliente.nombre_completo,
        documento: cliente.documento,
        telefono: cliente.telefono,
        servicio_id: null,
        servicio_nombre: null,
        sesiones_completadas: 0,
        sesiones_totales: 0,
        estado: "sin_tratamiento",
        pendiente_datos: cliente.pendiente_datos ?? false,
      });
    }
  }

  out.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return out;
}
