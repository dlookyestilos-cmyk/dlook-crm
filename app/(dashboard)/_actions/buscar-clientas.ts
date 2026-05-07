"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  cs_id: string;
  cliente_id: string;
  nombre: string;
  documento: string | null;
  telefono: string | null;
  servicio_id: string;
  servicio_nombre: string;
  sesiones_completadas: number;
  sesiones_totales: number;
  estado: "activo" | "pausado" | "completado";
};

/**
 * Busca clientas por nombre o documento en TODOS los servicios.
 * Devuelve un row por cada tratamiento (cliente_servicio) — si una
 * clienta toma 2 servicios, aparece dos veces para que el usuario pueda
 * abrir el modal 360 en el contexto correcto.
 */
export async function buscarClientas(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();

  // 1) Buscar clientas que matcheen
  const { data: clientes, error: clErr } = await supabase
    .from("clientes")
    .select("id, nombre_completo, documento, telefono")
    .or(`nombre_completo.ilike.%${q}%,documento.ilike.%${q}%`)
    .order("nombre_completo")
    .limit(8);

  if (clErr || !clientes || clientes.length === 0) return [];

  // 2) Traer sus tratamientos asociados
  const ids = clientes.map((c) => c.id);
  const { data: trats } = await supabase
    .from("cliente_servicio")
    .select(
      `
      id,
      cliente_id,
      sesiones_totales,
      sesiones_completadas,
      estado,
      servicio:servicio_id ( id, nombre )
    `
    )
    .in("cliente_id", ids);

  if (!trats) return [];

  const out: SearchResult[] = [];
  for (const t of trats) {
    const cliente = clientes.find((c) => c.id === t.cliente_id);
    if (!cliente) continue;
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
      estado: t.estado as SearchResult["estado"],
    });
  }

  // Ordenar: mismo nombre agrupado, alfabético
  out.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return out;
}
