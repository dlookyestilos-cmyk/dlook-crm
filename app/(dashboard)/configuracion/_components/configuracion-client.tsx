"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Check, Calendar, Webhook } from "lucide-react";
import { guardarCalendarId, registrarWebhooks } from "../../agenda/actions";

type Props = {
  googleCalendarId: string;
  esAdmin: boolean;
};

export default function ConfiguracionClient({ googleCalendarId, esAdmin }: Props) {
  const [calendarId, setCalendarId] = useState(googleCalendarId);
  const [savedAt,    setSavedAt]    = useState<number | null>(null);
  const [calError,   setCalError]   = useState<string | null>(null);
  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setCalError(null);
    startTransition(async () => {
      const res = await guardarCalendarId(calendarId);
      if (!res.ok) { setCalError(res.error); return; }
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    });
  }

  function handleWebhook() {
    setWebhookMsg(null);
    startTransition(async () => {
      const res = await registrarWebhooks();
      if (!res.ok) { setWebhookMsg(`Error: ${res.error}`); return; }
      setWebhookMsg(
        res.renovarEn
          ? `Webhooks activos. Renovar antes del ${res.renovarEn}.`
          : "Webhooks registrados correctamente."
      );
    });
  }

  return (
    <div className="max-w-2xl">
      {/* ── Google Calendar ID ── */}
      <section className="bg-white rounded-2xl border border-line-soft shadow-sm p-8 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-turquesa-mist flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-turquesa" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-cormorant text-[22px] text-turquesa-dark font-light leading-tight">
              Mi Google Calendar
            </h2>
            <p className="text-ink-soft text-[13px] font-light mt-1 leading-relaxed">
              Pega acá el ID de tu calendario de Google (normalmente es tu correo Gmail).
              Asegúrate de haber compartido ese calendario con la cuenta de servicio del CRM.
            </p>
          </div>
        </div>

        <form onSubmit={handleGuardar}>
          <label className="flex flex-col gap-2 mb-5">
            <span className="text-[10px] font-medium tracking-[2.5px] uppercase text-gold">
              Google Calendar ID
            </span>
            <input
              type="text"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              placeholder="nombre@gmail.com o ID del calendario"
              className="w-full bg-white px-4 py-3 rounded-xl border border-line-soft text-[14px] text-ink font-light focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition"
            />
          </label>

          {calError && (
            <div className="mb-4 bg-rosa-soft/50 border-l-2 border-rosa text-[#8B5454] text-[13px] px-4 py-3 rounded-md">
              {calError}
            </div>
          )}

          <div className="flex items-center gap-3 justify-end">
            {savedAt && (
              <span className="flex items-center gap-1.5 text-turquesa text-[13px]">
                <Check className="w-4 h-4" strokeWidth={2} />
                Guardado
              </span>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-turquesa text-white rounded-xl text-[13px] font-medium hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Webhooks (solo admin) ── */}
      {esAdmin && (
        <section className="bg-white rounded-2xl border border-line-soft shadow-sm p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gold-mist flex items-center justify-center shrink-0">
              <Webhook className="w-5 h-5 text-gold-dark" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-cormorant text-[22px] text-turquesa-dark font-light leading-tight">
                Sincronización en tiempo real
              </h2>
              <p className="text-ink-soft text-[13px] font-light mt-1 leading-relaxed">
                Registra los webhooks de Google Calendar para que los cambios que hagas
                directamente en Google Calendar aparezcan automáticamente en el CRM.
                Los webhooks duran 7 días y hay que renovarlos.
              </p>
            </div>
          </div>

          <div className="bg-crema rounded-xl p-4 mb-5 text-[12px] text-ink-soft font-light leading-relaxed">
            <strong className="text-ink font-medium">Requisitos:</strong> Tener configurado{" "}
            <code className="bg-white px-1 rounded text-[11px]">NEXT_PUBLIC_APP_URL</code>,{" "}
            <code className="bg-white px-1 rounded text-[11px]">GCAL_WEBHOOK_TOKEN</code> y
            las credenciales de la service account en las variables de entorno.
            Todos los perfiles con Google Calendar ID configurado recibirán un canal.
          </div>

          {webhookMsg && (
            <div className={`mb-4 text-[13px] px-4 py-3 rounded-md border-l-2 ${
              webhookMsg.startsWith("Error")
                ? "bg-rosa-soft/50 border-rosa text-[#8B5454]"
                : "bg-turquesa-mist border-turquesa text-turquesa-dark"
            }`}>
              {webhookMsg}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleWebhook}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 border border-turquesa text-turquesa-dark rounded-xl text-[13px] font-medium hover:bg-turquesa hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} strokeWidth={1.8} />
              Registrar / Renovar webhooks
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
