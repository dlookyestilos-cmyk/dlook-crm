"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { getIcon } from "./icon-map";
import { formatCOP } from "@/lib/format";

type ColorAcento = "turquesa" | "gold" | "rosa" | "deep";

const COLOR_CLASSES: Record<
  ColorAcento,
  { bar: string; iconBg: string; iconText: string; badge: string; border: string }
> = {
  turquesa: {
    bar:      "bg-turquesa",
    iconBg:   "bg-turquesa/10",
    iconText: "text-turquesa",
    badge:    "bg-turquesa/10 text-turquesa",
    border:   "hover:border-turquesa",
  },
  gold: {
    bar:      "bg-gold",
    iconBg:   "bg-gold/10",
    iconText: "text-gold",
    badge:    "bg-gold/10 text-gold-dark",
    border:   "hover:border-gold",
  },
  rosa: {
    bar:      "bg-rosa",
    iconBg:   "bg-rosa/15",
    iconText: "text-rosa",
    badge:    "bg-rosa/20 text-rosa",
    border:   "hover:border-rosa",
  },
  deep: {
    bar:      "bg-turquesa-dark",
    iconBg:   "bg-turquesa-dark/8",
    iconText: "text-turquesa-dark",
    badge:    "bg-turquesa-dark/10 text-turquesa-dark",
    border:   "hover:border-turquesa-dark",
  },
};

export type ServicioCardProps = {
  id: string;
  nombre: string;
  descripcion: string | null;
  icono: string;
  color_acento: string;
  precio_sesion: number | null;
  sesiones_paquete: number | null;
  precio_paquete: number | null;
  nota_precio: string | null;
  href?: string;
};

export default function ServicioCard(props: ServicioCardProps) {
  const Icon = getIcon(props.icono);
  const c = COLOR_CLASSES[(props.color_acento as ColorAcento) ?? "turquesa"];
  const href = props.href ?? `/servicios/${props.id}`;

  // Texto de precio
  const tienePaquete = props.precio_paquete != null && props.sesiones_paquete != null;
  const tieneSesion = props.precio_sesion != null;
  let precioPrimario = "";
  let precioSecundario = "";
  if (tieneSesion && tienePaquete) {
    precioPrimario = formatCOP(props.precio_sesion);
    precioSecundario = `${props.sesiones_paquete} sesiones · ${formatCOP(props.precio_paquete)}`;
  } else if (tieneSesion) {
    precioPrimario = formatCOP(props.precio_sesion);
    precioSecundario = props.nota_precio ?? "Por sesión";
  } else if (tienePaquete) {
    precioPrimario = formatCOP(props.precio_paquete);
    precioSecundario = props.nota_precio ?? `${props.sesiones_paquete} sesiones`;
  }

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group"
    >
      <Link
        href={href}
        className={`relative block bg-white rounded-[20px] p-7 border border-line-soft shadow-sm overflow-hidden transition-colors ${c.border} group-hover:shadow-[0_12px_32px_rgba(197,151,58,0.18)]`}
      >
        {/* Top bar accent */}
        <span
          className={`absolute top-0 left-0 right-0 h-[3px] ${c.bar} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
        />

        {/* Silueta watermark al hover */}
        <span className="absolute -right-7 -bottom-7 w-[110px] h-[110px] opacity-0 group-hover:opacity-[0.10] transition-opacity duration-500 pointer-events-none">
          <Image
            src="/brand/Silueta.png"
            alt=""
            width={110}
            height={110}
            className="w-full h-full object-contain"
          />
        </span>

        {/* Icono */}
        <div
          className={`w-[52px] h-[52px] rounded-[14px] ${c.iconBg} ${c.iconText} flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:-rotate-3`}
        >
          <Icon className="w-6 h-6" strokeWidth={1.5} />
        </div>

        {/* Nombre */}
        <h3 className="font-cormorant text-[22px] text-turquesa-dark mb-2 leading-tight">
          {props.nombre}
        </h3>

        {/* Descripción corta */}
        {props.descripcion && (
          <p className="text-[12px] text-ink-mute font-light leading-relaxed line-clamp-2 mb-4 min-h-[32px]">
            {props.descripcion}
          </p>
        )}

        {/* Precio */}
        <div className="flex items-end justify-between mt-2">
          <div>
            <div className="font-cormorant text-[24px] text-turquesa-dark leading-none">
              {precioPrimario}
            </div>
            <div className="text-[10px] tracking-[1.5px] uppercase text-ink-mute mt-1">
              {precioSecundario}
            </div>
          </div>
          {props.nota_precio && tienePaquete && tieneSesion && (
            <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full uppercase tracking-wider ${c.badge}`}>
              Paquete
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
