import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { gcalSyncIncremental } from "@/lib/google-calendar";

// Google Calendar envía POST a esta URL cuando algo cambia en un calendario observado.
// El header X-Goog-Channel-Token se usa para verificar la solicitud.
export async function POST(req: NextRequest) {
  const channelId    = req.headers.get("X-Goog-Channel-ID")    ?? "";
  const resourceState = req.headers.get("X-Goog-Resource-State") ?? "";
  const token         = req.headers.get("X-Goog-Channel-Token") ?? "";

  // Verificar token
  const expectedToken = process.env.GCAL_WEBHOOK_TOKEN;
  if (!expectedToken || token !== expectedToken) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Notificación de "sync" = solo confirmar que el canal fue registrado
  if (resourceState === "sync") {
    return new NextResponse("ok", { status: 200 });
  }

  const supabase = createServiceClient();

  // Buscar el canal en la BD para saber qué calendario cambió
  const { data: canal } = await supabase
    .from("gcal_channels")
    .select("calendar_id, profile_id, sync_token")
    .eq("channel_id", channelId)
    .single();

  if (!canal) return new NextResponse("ok", { status: 200 });

  // Traer solo los eventos cambiados usando syncToken
  const result = await gcalSyncIncremental(canal.calendar_id, canal.sync_token ?? null);
  if (!result) return new NextResponse("ok", { status: 200 });

  const esPersonal = true; // Este canal es del calendario personal del perfil

  for (const ev of result.items) {
    if (!ev.id || !ev.start?.dateTime) continue;

    const isCancelled = ev.status === "cancelled";

    // Buscar cita existente por event_id
    const { data: citaExistente } = await supabase
      .from("citas_agendadas")
      .select("id, fecha_hora, notas, estado")
      .or(`google_event_id.eq.${ev.id},google_event_id_personal.eq.${ev.id}`)
      .single();

    if (citaExistente) {
      await supabase.from("citas_agendadas").update({
        fecha_hora: ev.start.dateTime,
        notas:      ev.description ?? null,
        estado:     isCancelled ? "cancelada" : citaExistente.estado,
      }).eq("id", citaExistente.id);
    } else if (!isCancelled) {
      // Evento nuevo creado directo en Google Calendar → intentar importar
      const match = (ev.summary ?? "").match(/D'look\s*[—-]\s*([^·\n]+)/);
      const clienteNombre = match?.[1]?.trim();
      if (!clienteNombre) continue;

      const { data: clienteRow } = await supabase
        .from("clientes")
        .select("id")
        .ilike("nombre_completo", `%${clienteNombre}%`)
        .limit(1)
        .single();

      if (!clienteRow) continue;

      const durMin = ev.end?.dateTime
        ? Math.round((new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime).getTime()) / 60_000)
        : 60;

      await supabase.from("citas_agendadas").insert({
        cliente_id:               clienteRow.id,
        asignada_a:               canal.profile_id,
        fecha_hora:               ev.start.dateTime,
        duracion_minutos:         durMin,
        notas:                    ev.description ?? null,
        estado:                   "agendada",
        [esPersonal ? "google_event_id_personal" : "google_event_id"]: ev.id,
      });
    }
  }

  // Actualizar sync token para la próxima vez
  if (result.nextSyncToken) {
    await supabase
      .from("gcal_channels")
      .update({ sync_token: result.nextSyncToken })
      .eq("channel_id", channelId);
  }

  return new NextResponse("ok", { status: 200 });
}
