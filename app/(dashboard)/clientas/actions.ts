"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ClientaRow = {
  id: string;
  nombre_completo: string;
  documento: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
  gustos_preferencias: string | null;
  notas_generales: string | null;
  pendiente_datos: boolean;
  created_at: string;
};

export async function listarClientas(): Promise<ClientaRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select(
      "id, nombre_completo, documento, telefono, email, direccion, fecha_nacimiento, gustos_preferencias, notas_generales, pendiente_datos, created_at"
    )
    .order("pendiente_datos", { ascending: false })
    .order("nombre_completo", { ascending: true })
    .limit(500);
  return (data ?? []) as ClientaRow[];
}

export type ServicioBasico = {
  id: string;
  nombre: string;
  categoria: string;
};

export type ClientaServicioRow = {
  cs_id: string;
  servicio_id: string;
  servicio_nombre: string;
  sesiones_totales: number;
  sesiones_completadas: number;
  estado: "activo" | "pausado" | "completado";
  areas_tratadas: string[];
  fecha_inicio: string;
};

export async function listarServicios(): Promise<ServicioBasico[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("servicios")
    .select("id, nombre, categoria")
    .eq("activo", true)
    .order("nombre");
  return (data ?? []) as ServicioBasico[];
}

export async function obtenerServiciosCliente(clienteId: string): Promise<ClientaServicioRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cliente_servicio")
    .select(
      `id, servicio_id, sesiones_totales, sesiones_completadas, estado,
       areas_tratadas, fecha_inicio,
       servicio:servicio_id ( nombre )`
    )
    .eq("cliente_id", clienteId)
    .order("fecha_inicio", { ascending: false });

  return ((data ?? []) as any[]).map((row) => ({
    cs_id: row.id,
    servicio_id: row.servicio_id,
    servicio_nombre:
      (Array.isArray(row.servicio) ? row.servicio[0] : row.servicio)?.nombre ?? "Servicio",
    sesiones_totales: row.sesiones_totales,
    sesiones_completadas: row.sesiones_completadas,
    estado: row.estado,
    areas_tratadas: row.areas_tratadas ?? [],
    fecha_inicio: row.fecha_inicio,
  }));
}

export async function asignarServicioACliente(
  clienteId: string,
  servicioId: string,
  sesionesTotales: number,
  areas: string[]
): Promise<{ ok: true; cs_id: string; servicio_id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cliente_servicio")
    .insert({
      cliente_id: clienteId,
      servicio_id: servicioId,
      areas_tratadas: areas,
      sesiones_totales: Math.max(1, sesionesTotales),
      sesiones_completadas: 0,
      estado: "activo",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo asignar el servicio." };
  revalidatePath("/clientas");
  revalidatePath(`/servicios/${servicioId}`);
  return { ok: true, cs_id: data.id, servicio_id: servicioId };
}

export async function actualizarClientaInfo(
  id: string,
  updates: Partial<
    Pick<
      ClientaRow,
      | "nombre_completo"
      | "documento"
      | "telefono"
      | "email"
      | "direccion"
      | "fecha_nacimiento"
      | "gustos_preferencias"
      | "notas_generales"
      | "pendiente_datos"
    >
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/clientas");
  return { ok: true };
}
