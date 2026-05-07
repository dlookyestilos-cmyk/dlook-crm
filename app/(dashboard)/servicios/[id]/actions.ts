"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Crea una clienta nueva y la asocia al servicio dado.
 * Usa una "transacción" lógica: si falla la asociación, borra la clienta.
 */
export async function crearClienta(
  servicioId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const nombre = (formData.get("nombre_completo") as string)?.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const sesionesTotalesRaw = formData.get("sesiones_totales");
  const sesionesTotales =
    typeof sesionesTotalesRaw === "string" && sesionesTotalesRaw !== ""
      ? Math.max(1, parseInt(sesionesTotalesRaw, 10) || 1)
      : 1;

  const areasRaw = (formData.get("areas_tratadas") as string) ?? "";
  const areas = areasRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // 1) Insertar clienta
  const { data: clienta, error: errCliente } = await supabase
    .from("clientes")
    .insert({
      nombre_completo: nombre,
      documento: emptyToNull(formData.get("documento")),
      telefono: emptyToNull(formData.get("telefono")),
      email: emptyToNull(formData.get("email")),
      direccion: emptyToNull(formData.get("direccion")),
      fecha_nacimiento: emptyToNull(formData.get("fecha_nacimiento")),
      gustos_preferencias: emptyToNull(formData.get("gustos_preferencias")),
      notas_generales: emptyToNull(formData.get("notas_generales")),
    })
    .select("id")
    .single();

  if (errCliente || !clienta) {
    return { ok: false, error: errCliente?.message ?? "No se pudo crear la clienta." };
  }

  // 2) Asociar al servicio
  const { error: errCS } = await supabase.from("cliente_servicio").insert({
    cliente_id: clienta.id,
    servicio_id: servicioId,
    areas_tratadas: areas,
    sesiones_totales: sesionesTotales,
    sesiones_completadas: 0,
    estado: "activo",
  });

  if (errCS) {
    // Compensar: borrar clienta si la asociación falló
    await supabase.from("clientes").delete().eq("id", clienta.id);
    return { ok: false, error: errCS.message };
  }

  revalidatePath(`/servicios/${servicioId}`);
  return { ok: true };
}

/**
 * Actualiza datos personales de una clienta.
 */
export async function actualizarClienta(
  clienteId: string,
  servicioId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("clientes")
    .update({
      nombre_completo: (formData.get("nombre_completo") as string)?.trim(),
      documento: emptyToNull(formData.get("documento")),
      telefono: emptyToNull(formData.get("telefono")),
      email: emptyToNull(formData.get("email")),
      direccion: emptyToNull(formData.get("direccion")),
      fecha_nacimiento: emptyToNull(formData.get("fecha_nacimiento")),
      gustos_preferencias: emptyToNull(formData.get("gustos_preferencias")),
      notas_generales: emptyToNull(formData.get("notas_generales")),
    })
    .eq("id", clienteId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/servicios/${servicioId}`);
  return { ok: true };
}

/**
 * Actualiza datos del tratamiento (cliente_servicio).
 */
export async function actualizarTratamiento(
  clienteServicioId: string,
  servicioId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const sesionesTotalesRaw = formData.get("sesiones_totales");
  const sesionesCompletadasRaw = formData.get("sesiones_completadas");

  const areasRaw = (formData.get("areas_tratadas") as string) ?? "";
  const areas = areasRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const update: Record<string, unknown> = {
    areas_tratadas: areas,
    notas_tratamiento: emptyToNull(formData.get("notas_tratamiento")),
    estado: (formData.get("estado") as string) || "activo",
  };

  if (typeof sesionesTotalesRaw === "string" && sesionesTotalesRaw !== "") {
    update.sesiones_totales = Math.max(1, parseInt(sesionesTotalesRaw, 10) || 1);
  }
  if (typeof sesionesCompletadasRaw === "string" && sesionesCompletadasRaw !== "") {
    update.sesiones_completadas = Math.max(
      0,
      parseInt(sesionesCompletadasRaw, 10) || 0
    );
  }

  const { error } = await supabase
    .from("cliente_servicio")
    .update(update)
    .eq("id", clienteServicioId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/servicios/${servicioId}`);
  return { ok: true };
}
