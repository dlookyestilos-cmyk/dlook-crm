"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function marcarSesionPagada(
  sesionId: string,
  pagado: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sesiones")
    .update({ estado_pago: pagado ? "pagado" : "pendiente" })
    .eq("id", sesionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/facturacion");
  return { ok: true };
}
