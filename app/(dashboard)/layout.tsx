import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/app/_components/logout-button";
import Sidebar from "./_components/sidebar";
import Topbar from "./_components/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, rol, activo")
    .eq("id", user.id)
    .single();

  // Sin row en profiles o inactivo → acceso pendiente
  if (!profile || !profile.activo) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-crema p-6">
        <div className="bg-white rounded-3xl border border-line-soft shadow-xl p-12 max-w-md text-center">
          <h1 className="text-3xl text-turquesa-dark font-cormorant mb-3">
            Acceso pendiente
          </h1>
          <p className="text-ink-soft text-sm mb-6 leading-relaxed">
            Tu correo <strong className="text-turquesa">{user.email}</strong> no está
            autorizado todavía. Pedile a un administrador que te active.
          </p>
          <LogoutButton />
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-crema">
      <Sidebar rol={profile.rol as "admin" | "esteticista"} />
      <div className="flex-1 ml-[270px] flex flex-col min-w-0">
        <Topbar nombre={profile.nombre} email={user.email ?? ""} />
        <div className="flex-1 px-12 py-12 relative overflow-hidden">
          {/* Watermark de silueta en el contenido */}
          <div className="absolute right-6 top-8 w-[240px] h-[240px] opacity-[0.06] pointer-events-none z-0">
            <Image
              src="/brand/Silueta.png"
              alt=""
              width={240}
              height={240}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="relative z-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
