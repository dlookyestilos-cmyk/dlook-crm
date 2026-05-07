"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  Settings,
} from "lucide-react";
import LogoutLink from "./logout-link";

const NAV_OPERACION = [
  { href: "/", icon: LayoutGrid, label: "Servicios" },
  { href: "/clientas", icon: Users, label: "Clientas" },
  { href: "/agenda", icon: Calendar, label: "Agenda" },
];

const NAV_NEGOCIO = [
  { href: "/facturacion", icon: DollarSign, label: "Facturación" },
  { href: "/reportes", icon: BarChart3, label: "Reportes" },
];

const NAV_SISTEMA = [
  { href: "/configuracion", icon: Settings, label: "Configuración" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/servicios");
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar({ rol }: { rol: "admin" | "esteticista" }) {
  const pathname = usePathname();
  const negocioItems = rol === "admin" ? NAV_NEGOCIO : [];
  return (
    <aside className="fixed top-0 left-0 h-screen w-[270px] bg-crema border-r border-line flex flex-col py-9 z-40">
      {/* Logo + tagline */}
      <div className="px-7 pb-8 border-b border-line text-center">
        <div className="w-[78px] h-[78px] mx-auto mb-3.5 drop-shadow-[0_6px_14px_rgba(26,155,155,0.20)]">
          <Image
            src="/brand/Logo.png"
            alt="D'look y Estilos"
            width={78}
            height={78}
            className="w-full h-full object-contain rounded-full"
          />
        </div>
        <div className="text-[10px] tracking-[3px] text-gold uppercase font-normal">
          Estética Integral
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6">
        <NavSection title="Operación" items={NAV_OPERACION} pathname={pathname} />
        {negocioItems.length > 0 && (
          <NavSection title="Negocio" items={negocioItems} pathname={pathname} />
        )}
        <NavSection title="Sistema"   items={NAV_SISTEMA}   pathname={pathname} />
      </nav>

      {/* Watermark silueta */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-12 w-[160px] h-[160px] opacity-[0.06] pointer-events-none">
        <Image
          src="/brand/Silueta.png"
          alt=""
          width={160}
          height={160}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="px-4 pt-4 border-t border-line">
        <LogoutLink />
        <div className="text-center text-[10px] tracking-[1.5px] text-ink-mute uppercase mt-3">
          v0.1
        </div>
      </div>
    </aside>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: { href: string; icon: typeof LayoutGrid; label: string }[];
  pathname: string;
}) {
  return (
    <>
      <div className="text-[10px] tracking-[2.5px] text-ink-mute uppercase px-3.5 pt-4 pb-2.5 font-medium">
        {title}
      </div>
      {items.map(({ href, icon: Icon, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13.5px] mb-0.5 transition relative ${
              active
                ? "bg-white text-turquesa-dark shadow-sm font-medium"
                : "text-ink-soft hover:bg-white hover:text-turquesa-dark"
            }`}
          >
            {active && (
              <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-[3px] h-[22px] bg-gold rounded-r" />
            )}
            <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
            {label}
          </Link>
        );
      })}
    </>
  );
}
