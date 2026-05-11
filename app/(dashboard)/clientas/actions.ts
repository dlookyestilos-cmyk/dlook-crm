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
