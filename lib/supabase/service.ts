import { createClient } from "@supabase/supabase-js";

// Cliente con service role — bypassa RLS.
// Solo usar en rutas de API internas (webhooks, cron jobs).
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
