import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { gcalRegistrarWatch, gcalDetenerWatch } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase   = createServiceClient();
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL;
  const token      = process.env.GCAL_WEBHOOK_TOKEN;

  if (!appUrl || !token) {
    return NextResponse.json({ ok: false, error: "Variables de entorno faltantes" }, { status: 500 });
  }

  const webhookUrl = `${appUrl}/api/gcal-webhook`;

  // Detener canales anteriores
  const { data: canalesAnteriores } = await supabase.from("gcal_channels").select("channel_id, resource_id");
  for (const canal of canalesAnteriores ?? []) {
    if (canal.resource_id) await gcalDetenerWatch(canal.channel_id, canal.resource_id);
  }
  await supabase.from("gcal_channels").delete().not("channel_id", "is", null);

  // Registrar nuevo watch por cada calendario activo
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, google_calendar_id")
    .eq("activo", true)
    .not("google_calendar_id", "is", null);

  let renovados = 0;
  for (const p of profiles ?? []) {
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
    renovados++;
  }

  return NextResponse.json({ ok: true, renovados });
}
