import { google } from "googleapis";

// ======================================
// Cliente autenticado con service account
// ======================================
function getCalendarClient() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) return null;

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

// ======================================
// Tipos
// ======================================
export type GCalEvent = {
  summary: string;
  description?: string;
  start: string;       // ISO con offset Colombia: "2025-01-15T10:00:00-05:00"
  duracion: number;    // minutos
  eventId?: string;    // para update/delete
};

function endTime(start: string, minutes: number): string {
  return new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
}

// ======================================
// Crear evento en UN calendario
// ======================================
export async function gcalCrear(calendarId: string, ev: GCalEvent): Promise<string | null> {
  const cal = getCalendarClient();
  if (!cal || !calendarId) return null;
  try {
    const res = await cal.events.insert({
      calendarId,
      requestBody: {
        summary:     ev.summary,
        description: ev.description,
        start: { dateTime: ev.start,                        timeZone: "America/Bogota" },
        end:   { dateTime: endTime(ev.start, ev.duracion),  timeZone: "America/Bogota" },
      },
    });
    return res.data.id ?? null;
  } catch {
    return null;
  }
}

// ======================================
// Actualizar evento en UN calendario
// ======================================
export async function gcalActualizar(calendarId: string, ev: GCalEvent): Promise<boolean> {
  if (!ev.eventId || !calendarId) return false;
  const cal = getCalendarClient();
  if (!cal) return false;
  try {
    await cal.events.patch({
      calendarId,
      eventId: ev.eventId,
      requestBody: {
        summary:     ev.summary,
        description: ev.description,
        start: { dateTime: ev.start,                        timeZone: "America/Bogota" },
        end:   { dateTime: endTime(ev.start, ev.duracion),  timeZone: "America/Bogota" },
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ======================================
// Eliminar evento de UN calendario
// ======================================
export async function gcalEliminar(calendarId: string, eventId: string): Promise<boolean> {
  if (!calendarId || !eventId) return false;
  const cal = getCalendarClient();
  if (!cal) return false;
  try {
    await cal.events.delete({ calendarId, eventId });
    return true;
  } catch {
    return false;
  }
}

// ======================================
// Listar eventos (para sync manual)
// ======================================
export async function gcalListar(calendarId: string, desde: string, hasta: string) {
  if (!calendarId) return null;
  const cal = getCalendarClient();
  if (!cal) return null;
  try {
    const res = await cal.events.list({
      calendarId,
      timeMin:      desde,
      timeMax:      hasta,
      singleEvents: true,
      orderBy:      "startTime",
      maxResults:   250,
    });
    return res.data.items ?? [];
  } catch {
    return null;
  }
}

// ======================================
// Incremental sync — usa syncToken para traer solo cambios
// ======================================
export async function gcalSyncIncremental(calendarId: string, syncToken: string | null) {
  if (!calendarId) return null;
  const cal = getCalendarClient();
  if (!cal) return null;
  try {
    let res;
    if (syncToken) {
      res = await cal.events.list({ calendarId, singleEvents: true, maxResults: 250, syncToken });
    } else {
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      res = await cal.events.list({ calendarId, singleEvents: true, maxResults: 250, timeMin });
    }
    return {
      items:         res.data.items ?? [],
      nextSyncToken: res.data.nextSyncToken ?? null,
    };
  } catch {
    return null;
  }
}

// ======================================
// Registrar webhook (watch channel) para un calendario
// ======================================
export async function gcalRegistrarWatch(
  calendarId: string,
  channelId: string,
  webhookUrl: string,
  token: string
) {
  const cal = getCalendarClient();
  if (!cal || !calendarId) return null;
  try {
    // Expira en 7 días (máximo para resources de tipo events)
    const expiresMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const res = await cal.events.watch({
      calendarId,
      requestBody: {
        id:         channelId,
        type:       "web_hook",
        address:    webhookUrl,
        token,
        expiration: String(expiresMs),
      },
    });
    return {
      resourceId: res.data.resourceId ?? null,
      expiration: res.data.expiration ? new Date(Number(res.data.expiration)) : null,
    };
  } catch {
    return null;
  }
}

// ======================================
// Detener un watch channel
// ======================================
export async function gcalDetenerWatch(channelId: string, resourceId: string) {
  const cal = getCalendarClient();
  if (!cal) return;
  try {
    await cal.channels.stop({
      requestBody: { id: channelId, resourceId },
    });
  } catch {
    // silencioso
  }
}
