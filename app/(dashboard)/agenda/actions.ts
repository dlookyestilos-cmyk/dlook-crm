"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  gcalCrear,
  gcalActualizar,
  gcalEliminar,
  gcalListar,
  gcalRegistrarWatch,
  gcalDetenerWatch,
  type GCalEvent,
} from "@/lib/google-calendar";

export type ActionResult = { ok: true } | { ok: false; error: string };

/* =========================================================
   Helpers internos
   ========================================================= */

async function buildSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clienteId: string,
  servicioId: string | null
): Promise<string> {
  const { data: c } = await supabase.from("clientes").select("nombre_completo").eq("id", clienteId).single();
  const nombre = c?.nombre_completo ?? "Clienta";
  if (!servicioId) return `D'look — ${nombre}`;
  const { data: s } = await supabase.from("servicios").select("nombre").eq("id", servicioId).single();
  return s?.nombre ? `D'look — ${nombre} · ${s.nombre}` : `D'look — ${nombre}`;
}

async function getAdminCalendarId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("google_calendar_id")
    .eq("rol", "admin")
    .eq("activo", true)
    .limit(1)
    .single();
  return data?.google_calendar_id ?? null;
}

async function getProfileCalendarId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string | null
): Promise<string | null> {
  if (!profileId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("google_calendar_id")
    .eq("id", profileId)
    .single();
  return data?.google_calendar_id ?? null;
}

/* =========================================================
   CRUD de citas
   ========================================================= */

export async function crearCita(formData: FormData): Promise<ActionResult> {
  const supabase   = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil }   = await supabase.from("profiles").select("rol, google_calendar_id").eq("id", user!.id).single();

  const fecha              = (formData.get("fecha")               as string)?.trim();
  const hora               = (formData.get("hora")                as string)?.trim();
  const clienteIdRaw       = (formData.get("cliente_id")          as string)?.trim();
  const nuevaClientaNombre = (formData.get("nueva_clienta_nombre") as string)?.trim() || null;
  const servicioId         = (formData.get("servicio_id")         as string)?.trim() || null;
  const asignadaA          = (formData.get("asignada_a")          as string)?.trim() || null;
  const duracion           = parseInt(formData.get("duracion_minutos") as string) || 60;
  const notas              = (formData.get("notas")               as string)?.trim() || null;

  if (!fecha || !hora) {
    return { ok: false, error: "Fecha y hora son requeridas." };
  }
  if (!clienteIdRaw && !nuevaClientaNombre) {
    return { ok: false, error: "La clienta es requerida." };
  }

  // Crear clienta nueva si no existe aún
  let clienteId = clienteIdRaw;
  if (!clienteId && nuevaClientaNombre) {
    const { data: nuevaClienta } = await supabase
      .from("clientes")
      .insert({ nombre_completo: nuevaClientaNombre, pendiente_datos: true })
      .select("id")
      .single();
    if (!nuevaClienta) return { ok: false, error: "No se pudo crear la clienta." };
    clienteId = nuevaClienta.id;
  }

  const fechaHora = `${fecha}T${hora}:00-05:00`;
  const summary   = await buildSummary(supabase, clienteId, servicioId);

  const ev: GCalEvent = { summary, description: notas ?? undefined, start: fechaHora, duracion };

  // Sync al calendario maestro (admin)
  const adminCalId   = await getAdminCalendarId(supabase);
  const masterEventId = await gcalCrear(adminCalId ?? "", ev);

  // Sync al calendario personal del asignado (si es distinto del admin)
  const personalCalId = await getProfileCalendarId(supabase, asignadaA);
  const isAdmin = perfil?.rol === "admin";
  // Si el asignado es el admin mismo, no duplicar
  const personalEventId =
    personalCalId && personalCalId !== adminCalId
      ? await gcalCrear(personalCalId, ev)
      : null;

  const { error } = await supabase.from("citas_agendadas").insert({
    cliente_id:            clienteId,
    servicio_id:           servicioId,
    asignada_a:            asignadaA,
    fecha_hora:            fechaHora,
    duracion_minutos:      duracion,
    notas,
    estado:                "agendada",
    creado_por:            user!.id,
    google_event_id:       masterEventId,
    google_event_id_personal: personalEventId,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/agenda");
  return { ok: true };
}

export async function actualizarCita(citaId: string, formData: FormData): Promise<ActionResult> {
  const supabase  = await createClient();

  const fecha      = (formData.get("fecha")      as string)?.trim();
  const hora       = (formData.get("hora")       as string)?.trim();
  const clienteId  = (formData.get("cliente_id") as string)?.trim();
  const servicioId = (formData.get("servicio_id") as string)?.trim() || null;
  const asignadaA  = (formData.get("asignada_a") as string)?.trim() || null;
  const duracion   = parseInt(formData.get("duracion_minutos") as string) || 60;
  const notas      = (formData.get("notas") as string)?.trim() || null;
  const estado     = (formData.get("estado") as string) || "agendada";

  if (!fecha || !hora || !clienteId) {
    return { ok: false, error: "Fecha, hora y clienta son requeridos." };
  }

  const fechaHora = `${fecha}T${hora}:00-05:00`;
  const summary   = await buildSummary(supabase, clienteId, servicioId);

  const { data: citaActual } = await supabase
    .from("citas_agendadas")
    .select("google_event_id, google_event_id_personal, asignada_a")
    .eq("id", citaId)
    .single();

  const ev: GCalEvent = { summary, description: notas ?? undefined, start: fechaHora, duracion };

  const adminCalId    = await getAdminCalendarId(supabase);
  const personalCalId = await getProfileCalendarId(supabase, asignadaA);

  // Actualizar en calendario maestro
  if (citaActual?.google_event_id && adminCalId) {
    await gcalActualizar(adminCalId, { ...ev, eventId: citaActual.google_event_id });
  } else if (adminCalId) {
    const newId = await gcalCrear(adminCalId, ev);
    if (newId) await supabase.from("citas_agendadas").update({ google_event_id: newId }).eq("id", citaId);
  }

  // Actualizar en calendario personal
  let personalEventId = citaActual?.google_event_id_personal;
  if (personalCalId && personalCalId !== adminCalId) {
    if (personalEventId) {
      await gcalActualizar(personalCalId, { ...ev, eventId: personalEventId });
    } else {
      personalEventId = await gcalCrear(personalCalId, ev) ?? undefined;
    }
  }

  const { error } = await supabase.from("citas_agendadas").update({
    cliente_id:               clienteId,
    servicio_id:              servicioId,
    asignada_a:               asignadaA,
    fecha_hora:               fechaHora,
    duracion_minutos:         duracion,
    notas,
    estado,
    google_event_id_personal: personalEventId ?? null,
  }).eq("id", citaId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/agenda");
  return { ok: true };
}

export async function eliminarCita(citaId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: cita } = await supabase
    .from("citas_agendadas")
    .select("google_event_id, google_event_id_personal, asignada_a")
    .eq("id", citaId)
    .single();

  const adminCalId    = await getAdminCalendarId(supabase);
  const personalCalId = await getProfileCalendarId(supabase, cita?.asignada_a ?? null);

  // Intentar borrar todas las combinaciones conocidas de event_id × calendar_id
  const eventIds = [...new Set([cita?.google_event_id, cita?.google_event_id_personal].filter(Boolean) as string[])];
  const calIds   = [...new Set([adminCalId, personalCalId].filter(Boolean) as string[])];
  for (const eventId of eventIds) {
    for (const calId of calIds) {
      await gcalEliminar(calId, eventId);
    }
  }

  const { error } = await supabase.from("citas_agendadas").delete().eq("id", citaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agenda");
  return { ok: true };
}

/* =========================================================
   Sincronización manual: Google Calendar → CRM
   Trae eventos de TODOS los calendarios configurados.
   ========================================================= */

export async function sincronizarDesdeGcal(
  year: number,
  month: number
): Promise<{ ok: true; actualizadas: number; importadas: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("profiles").select("rol, google_calendar_id").eq("id", user!.id).single();

  const desde = new Date(year, month, 1).toISOString();
  const hasta  = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  // Calendarios a sincronizar según el rol
  let calendarIds: { calId: string; esPersonal: boolean }[] = [];

  if (perfil?.rol === "admin") {
    // Admin: sincroniza SU calendario y el de cada esteticista
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, google_calendar_id")
      .eq("activo", true)
      .not("google_calendar_id", "is", null);

    calendarIds = (profiles ?? [])
      .filter((p) => p.google_calendar_id)
      .map((p) => ({ calId: p.google_calendar_id!, esPersonal: p.id !== user!.id }));
  } else {
    // Esteticista: solo su propio calendario
    if (perfil?.google_calendar_id) {
      calendarIds = [{ calId: perfil.google_calendar_id, esPersonal: true }];
    }
  }

  if (calendarIds.length === 0) {
    return { ok: false, error: "Ningún calendario configurado. Ve a Configuración para agregar tu Google Calendar ID." };
  }

  let actualizadas = 0;
  let importadas   = 0;

  for (const { calId, esPersonal } of calendarIds) {
    const eventos = await gcalListar(calId, desde, hasta);
    if (!eventos) continue;

    for (const ev of eventos) {
      if (!ev.id) continue;

      const isCancelled = ev.status === "cancelled";
      if (!isCancelled && !ev.start?.dateTime) continue;

      // Buscar cita existente por google_event_id (maestro o personal)
      const { data: citaExistente } = await supabase
        .from("citas_agendadas")
        .select("id, fecha_hora, notas")
        .or(`google_event_id.eq.${ev.id},google_event_id_personal.eq.${ev.id}`)
        .single();

      if (citaExistente) {
        if (isCancelled) {
          // Evento eliminado en GCal → eliminar del CRM
          await supabase.from("citas_agendadas").delete().eq("id", citaExistente.id);
          actualizadas++;
        } else {
          const nuevaFechaHora = ev.start!.dateTime!;
          const nuevasNotas    = ev.description ?? null;
          if (citaExistente.fecha_hora !== nuevaFechaHora || citaExistente.notas !== nuevasNotas) {
            await supabase.from("citas_agendadas").update({
              fecha_hora: nuevaFechaHora,
              notas:      nuevasNotas,
            }).eq("id", citaExistente.id);
            actualizadas++;
          }
        }
        continue;
      }

      if (isCancelled) continue; // No existe en CRM y fue borrado en GCal → ignorar

      {
        // Evento nuevo en GCal → intentar importar
        // Parsear cliente del summary: "D'look — Nombre · Servicio"
        const match = (ev.summary ?? "").match(/D'look\s*[—-]\s*([^·\n]+)/);
        const clienteNombre = match?.[1]?.trim();
        if (!clienteNombre) continue;

        const { data: clienteRow } = await supabase
          .from("clientes")
          .select("id")
          .ilike("nombre_completo", `%${clienteNombre}%`)
          .limit(1)
          .single();

        let clienteFinalId: string;
        if (clienteRow) {
          clienteFinalId = clienteRow.id;
        } else {
          const { data: nuevaClienta } = await supabase
            .from("clientes")
            .insert({ nombre_completo: clienteNombre, pendiente_datos: true })
            .select("id")
            .single();
          if (!nuevaClienta) continue;
          clienteFinalId = nuevaClienta.id;
        }

        const durMin = ev.end?.dateTime && ev.start?.dateTime
          ? Math.round((new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime).getTime()) / 60_000)
          : 60;

        await supabase.from("citas_agendadas").insert({
          cliente_id:               clienteFinalId,
          fecha_hora:               ev.start!.dateTime!,
          duracion_minutos:         durMin,
          notas:                    ev.description ?? null,
          estado:                   "agendada",
          creado_por:               user!.id,
          [esPersonal ? "google_event_id_personal" : "google_event_id"]: ev.id,
        });
        importadas++;
      }
    }
  }

  revalidatePath("/agenda");
  return { ok: true, actualizadas, importadas };
}

/* =========================================================
   Webhooks — registrar watch channels
   ========================================================= */

export async function registrarWebhooks(): Promise<ActionResult & { renovarEn?: string }> {
  const supabase  = await createClient();
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL;
  const token     = process.env.GCAL_WEBHOOK_TOKEN;

  if (!appUrl) return { ok: false, error: "Falta NEXT_PUBLIC_APP_URL en las variables de entorno." };
  if (!token)  return { ok: false, error: "Falta GCAL_WEBHOOK_TOKEN en las variables de entorno." };

  const webhookUrl = `${appUrl}/api/gcal-webhook`;

  // Obtener todos los perfiles con google_calendar_id
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, google_calendar_id, nombre")
    .eq("activo", true)
    .not("google_calendar_id", "is", null);

  if (!profiles?.length) {
    return { ok: false, error: "Ningún perfil tiene Google Calendar ID configurado." };
  }

  // Detener canales anteriores
  const { data: canalesAnteriores } = await supabase.from("gcal_channels").select("channel_id, resource_id");
  for (const canal of canalesAnteriores ?? []) {
    if (canal.resource_id) await gcalDetenerWatch(canal.channel_id, canal.resource_id);
  }
  await supabase.from("gcal_channels").delete().not("channel_id", "is", null);

  // Registrar nuevo watch por cada calendario
  let expiresAt: Date | null = null;
  for (const p of profiles) {
    if (!p.google_calendar_id) continue;
    const channelId = `dlook-${p.id}`;
    const result = await gcalRegistrarWatch(p.google_calendar_id, channelId, webhookUrl, token);
    if (!result) continue;

    await supabase.from("gcal_channels").insert({
      channel_id:  channelId,
      profile_id:  p.id,
      calendar_id: p.google_calendar_id,
      resource_id: result.resourceId,
      expires_at:  result.expiration?.toISOString() ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (!expiresAt || (result.expiration && result.expiration < expiresAt)) {
      expiresAt = result.expiration;
    }
  }

  revalidatePath("/configuracion");
  return {
    ok: true,
    renovarEn: expiresAt
      ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(expiresAt)
      : undefined,
  };
}

export async function guardarCalendarId(calendarId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("profiles")
    .update({ google_calendar_id: calendarId.trim() || null })
    .eq("id", user!.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/configuracion");
  return { ok: true };
}
