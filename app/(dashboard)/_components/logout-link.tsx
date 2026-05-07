"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutLink() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] text-ink-soft hover:text-rosa hover:bg-white transition disabled:opacity-50"
    >
      <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
      {isPending ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}
