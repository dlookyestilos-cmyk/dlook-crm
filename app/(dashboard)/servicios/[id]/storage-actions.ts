"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora

export type ActionResult = { ok: true } | { ok: false; error: string };

function safeFileName(name: string): string {
  // Sanitiza para Storage: solo letras, números, guion, punto, underscore
  const base = name.normalize("NFKD").replace(/[̀-ͯ]/g, ""); // quita tildes
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/* ============================================================
   CONSENTIMIENTOS (PDFs)
   ============================================================ */

export type ConsentimientoView = {
  id: string;
  nombre_archivo: string;
  fecha_firma: string;
  signed_url: string;
};

export async function listarConsentimientos(
  clienteId: string
): Promise<ConsentimientoView[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("consentimientos")
    .select("id, nombre_archivo, fecha_firma, storage_path")
    .eq("cliente_id", clienteId)
    .order("fecha_firma", { ascending: false });

  if (error || !rows) return [];

  const out: ConsentimientoView[] = [];
  for (const r of rows) {
    const { data: signed } = await supabase.storage
      .from("consentimientos")
      .createSignedUrl(r.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) {
      out.push({
        id: r.id,
        nombre_archivo: r.nombre_archivo,
        fecha_firma: r.fecha_firma,
        signed_url: signed.signedUrl,
      });
    }
  }
  return out;
}

export async function subirConsentimiento(
  clienteId: string,
  servicioId: string,
  formData: FormData
): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No se seleccionó ningún archivo." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "El archivo debe ser un PDF." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const path = `${clienteId}/${Date.now()}_${safeFileName(file.name)}`;

  const { error: upErr } = await supabase.storage
    .from("consentimientos")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) return { ok: false, error: upErr.message };

  const { error: insErr } = await supabase.from("consentimientos").insert({
    cliente_id: clienteId,
    servicio_id: servicioId,
    storage_path: path,
    nombre_archivo: file.name,
    uploaded_by: user.id,
  });
  if (insErr) {
    // Compensar upload si la inserción falló
    await supabase.storage.from("consentimientos").remove([path]);
    return { ok: false, error: insErr.message };
  }

  revalidatePath(`/servicios/${servicioId}`);
  return { ok: true };
}

export async function eliminarConsentimiento(
  consentimientoId: string,
  servicioId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("consentimientos")
    .select("storage_path")
    .eq("id", consentimientoId)
    .single();

  if (!row) return { ok: false, error: "No se encontró el consentimiento." };

  const { error: rmErr } = await supabase.storage
    .from("consentimientos")
    .remove([row.storage_path]);
  if (rmErr) return { ok: false, error: rmErr.message };

  const { error: delErr } = await supabase
    .from("consentimientos")
    .delete()
    .eq("id", consentimientoId);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath(`/servicios/${servicioId}`);
  return { ok: true };
}

/* ============================================================
   FOTOS DEL PROCESO
   ============================================================ */

export type FotoView = {
  id: string;
  fecha: string;
  numero_sesion: number | null;
  notas: string | null;
  signed_url: string;
};

export async function listarFotos(clienteId: string): Promise<FotoView[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("fotos_proceso")
    .select("id, fecha, numero_sesion, notas, storage_path")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: true })
    .order("numero_sesion", { ascending: true, nullsFirst: false });

  if (error || !rows) return [];

  const out: FotoView[] = [];
  for (const r of rows) {
    const { data: signed } = await supabase.storage
      .from("fotos-proceso")
      .createSignedUrl(r.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) {
      out.push({
        id: r.id,
        fecha: r.fecha,
        numero_sesion: r.numero_sesion,
        notas: r.notas,
        signed_url: signed.signedUrl,
      });
    }
  }
  return out;
}

export async function subirFotos(
  clienteId: string,
  clienteServicioId: string,
  servicioId: string,
  formData: FormData
): Promise<ActionResult> {
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "No se seleccionaron archivos." };

  const numeroSesionRaw = formData.get("numero_sesion");
  const numeroSesion =
    typeof numeroSesionRaw === "string" && numeroSesionRaw.trim() !== ""
      ? Math.max(0, parseInt(numeroSesionRaw, 10) || 0)
      : null;

  const notas = (formData.get("notas") as string)?.trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const errors: string[] = [];
  const uploaded: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      errors.push(`${file.name}: no es una imagen.`);
      continue;
    }
    const path = `${clienteId}/${Date.now()}_${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage
      .from("fotos-proceso")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      errors.push(`${file.name}: ${upErr.message}`);
      continue;
    }
    uploaded.push(path);

    const { error: insErr } = await supabase.from("fotos_proceso").insert({
      cliente_id: clienteId,
      cliente_servicio_id: clienteServicioId,
      storage_path: path,
      numero_sesion: numeroSesion,
      notas: notas,
      uploaded_by: user.id,
    });
    if (insErr) {
      errors.push(`${file.name}: ${insErr.message}`);
      await supabase.storage.from("fotos-proceso").remove([path]);
    }
  }

  if (errors.length > 0 && uploaded.length === 0) {
    return { ok: false, error: errors.join(" · ") };
  }

  revalidatePath(`/servicios/${servicioId}`);

  if (errors.length > 0) {
    return { ok: false, error: `Algunas fallaron: ${errors.join(" · ")}` };
  }
  return { ok: true };
}

export async function eliminarFoto(
  fotoId: string,
  servicioId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("fotos_proceso")
    .select("storage_path")
    .eq("id", fotoId)
    .single();

  if (!row) return { ok: false, error: "No se encontró la foto." };

  const { error: rmErr } = await supabase.storage
    .from("fotos-proceso")
    .remove([row.storage_path]);
  if (rmErr) return { ok: false, error: rmErr.message };

  const { error: delErr } = await supabase
    .from("fotos_proceso")
    .delete()
    .eq("id", fotoId);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath(`/servicios/${servicioId}`);
  return { ok: true };
}
