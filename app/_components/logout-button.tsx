"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="px-5 py-2.5 bg-turquesa text-white rounded-xl text-sm font-medium tracking-wide hover:bg-turquesa-dark transition shadow-sm"
    >
      Cerrar sesión
    </button>
  );
}
