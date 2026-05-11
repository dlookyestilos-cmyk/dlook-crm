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
    if (!ev.id) continue;

    const isCancelled = ev.status === "cancelled";

    // Eventos cancelados sin fecha no tienen datos útiles más allá del id
    if (!isCancelled && !ev.start?.dateTime) continue;

    // Buscar cita existente por event_id
    const { data: citaExistente } = await supabase
      .from("citas_agendadas")
      .select("id, cliente_id, fecha_hora, notas")
      .or(`google_event_id.eq.${ev.id},google_event_id_personal.eq.${ev.id}`)
      .single();

    if (citaExistente) {
      if (isCancelled) {
        // Evento eliminado en GCal → eliminar también del CRM
        await supabase.from("citas_agendadas").delete().eq("id", citaExistente.id);
      } else {
        // Evento modificado → sincronizar todos los cambios
        const updates: Record<string, unknown> = {
          fecha_hora: ev.start!.dateTime!,
          notas:      ev.description ?? null,
        };

        // Si el título cambió, intentar actualizar el cliente
        const match = (ev.summary ?? "").match(/D'look\s*[—-]\s*([^·\n]+)/);
        const nuevoNombre = match?.[1]?.trim();
        if (nuevoNombre) {
          const { data: clienteRow } = await supabase
            .from("clientes")
            .select("id")
            .ilike("nombre_completo", `%${nuevoNombre}%`)
            .limit(1)
            .single();
          if (clienteRow && clienteRow.id !== (citaExistente as any).cliente_id) {
            updates.cliente_id = clienteRow.id;
          } else if (!clienteRow) {
            // Cliente no existe → crear con datos pendientes y actualizar la cita
            const { data: nueva } = await supabase
              .from("clientes")
              .insert({ nombre_completo: nuevoNombre, pendiente_datos: true })
              .select("id")
              .single();
            if (nueva) updates.cliente_id = nueva.id;
          }
        }

        await supabase.from("citas_agendadas").update(updates).eq("id", citaExistente.id);
      }
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
        asignada_a:               canal.profile_id,
        fecha_hora:               ev.start!.dateTime!,
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
