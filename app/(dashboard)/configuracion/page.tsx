import { createClient } from "@/lib/supabase/server";
import ConfiguracionClient from "./_components/configuracion-client";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("google_calendar_id, rol")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <header className="mb-10">
        <span className="block text-[14px] tracking-[0.16em] uppercase text-gold font-light italic mb-1 font-cormorant">
          Ajustes del
        </span>
        <h1 className="font-cormorant text-[44px] font-light text-turquesa-dark leading-tight">
          Configuración
        </h1>
        <p className="text-ink-soft text-[15px] font-light mt-2">
          Conecta tu Google Calendar y configura la sincronización.
        </p>
      </header>

      <ConfiguracionClient
        googleCalendarId={perfil?.google_calendar_id ?? ""}
        esAdmin={perfil?.rol === "admin"}
      />
    </div>
  );
}
