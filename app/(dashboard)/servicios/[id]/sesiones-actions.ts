"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type SesionView = {
  id: string;
  fecha: string;
  notas: string | null;
  estado_pago: "pagado" | "pendiente";
  monto: number | null;
  realizada_por: string | null;
  realizada_por_nombre: string | null;
};

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function parseMonto(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Actualiza sesiones_completadas en cliente_servicio con el conteo real.
 * No falla si la fila ya no existe.
 */
async function recalcSesionesCompletadas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clienteServicioId: string
) {
  const { count } = await supabase
    .from("sesiones")
    .select("*", { count: "exact", head: true })
    .eq("cliente_servicio_id", clienteServicioId);

  await supabase
    .from("cliente_servicio")
    .update({ sesiones_completadas: count ?? 0 })
    .eq("id", clienteServicioId);
}

/* ============================================================
   LISTAR
   ============================================================ */

export async function listarSesiones(
  clienteServicioId: string
): Promise<SesionView[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sesiones")
    .select(
      `
      id, fecha, notas, estado_pago, monto, realizada_por,
      profile:realizada_por ( nombre )
    `
    )
    .eq("cliente_servicio_id", clienteServicioId)
    .order("fecha", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return {
      id: row.id,
      fecha: row.fecha,
      notas: row.notas,
      estado_pago: row.estado_pago as SesionView["estado_pago"],
      monto: row.monto != null ? Number(row.monto) : null,
      realizada_por: row.realizada_por,
      realizada_por_nombre: profile?.nombre ?? null,
    };
  });
}

/* ============================================================
   REGISTRAR
   ============================================================ */

export async function registrarSesion(
  clienteServicioId: string,
  servicioId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const fecha = emptyToNull(formData.get("fecha")) ?? new Date().toISOString().slice(0, 10);
  const notas = emptyToNull(formData.get("notas"));
  const monto = parseMonto(formData.get("monto"));
  const estadoPagoRaw = formData.get("estado_pago");
  const estado_pago =
    estadoPagoRaw === "pagado" ? "pagado" : "pendiente";

  const { error } = await supabase.from("sesiones").insert({
    cliente_servicio_id: clienteServicioId,
    fecha,
    notas,
    estado_pago,
    monto,
    realizada_por: user.id,
  });

  if (error) return { ok: false, error: error.message };

  await recalcSesionesCompletadas(supabase, clienteServicioId);

  revalidatePath(`/servicios/${servicioId}`);
  revalidatePath(`/facturacion`);
  return { ok: true };
}

/* ============================================================
   ACTUALIZAR
   ============================================================ */

export async function actualizarSesion(
  sesionId: string,
  clienteServicioId: string,
  servicioId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const fecha = emptyToNull(formData.get("fecha"));
  const notas = emptyToNull(formData.get("notas"));
  const monto = parseMonto(formData.get("monto"));
  const estadoPagoRaw = formData.get("estado_pago");

  const update: Record<string, unknown> = {
    notas,
    monto,
  };
  if (fecha) update.fecha = fecha;
  if (estadoPagoRaw === "pagado" || estadoPagoRaw === "pendiente") {
    update.estado_pago = estadoPagoRaw;
  }

  const { error } = await supabase.from("sesiones").update(update).eq("id", sesionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/servicios/${servicioId}`);
  revalidatePath(`/facturacion`);
  return { ok: true };
}

/* ============================================================
   MARCAR PAGADO / PENDIENTE
   ============================================================ */

export async function toggleEstadoPago(
  sesionId: string,
  servicioId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("sesiones")
    .select("estado_pago")
    .eq("id", sesionId)
    .single();

  if (!row) return { ok: false, error: "Sesión no encontrada." };

  const nuevo = row.estado_pago === "pagado" ? "pendiente" : "pagado";

  const { error } = await supabase
    .from("sesiones")
    .update({ estado_pago: nuevo })
    .eq("id", sesionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/servicios/${servicioId}`);
  revalidatePath(`/facturacion`);
  return { ok: true };
}

/* ============================================================
   ELIMINAR
   ============================================================ */

export async function eliminarSesion(
  sesionId: string,
  clienteServicioId: string,
  servicioId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("sesiones").delete().eq("id", sesionId);
  if (error) return { ok: false, error: error.message };

  await recalcSesionesCompletadas(supabase, clienteServicioId);

  revalidatePath(`/servicios/${servicioId}`);
  revalidatePath(`/facturacion`);
  return { ok: true };
}
