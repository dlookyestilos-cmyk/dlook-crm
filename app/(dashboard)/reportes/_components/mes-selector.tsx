"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export default function MesSelector({ year, month }: { year: number; month: number }) {
  const router = useRouter();

  function navMes(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    router.push(`/reportes?mes=${y}-${String(m + 1).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center gap-4 print:hidden">
      <div className="flex items-center gap-1 bg-white border border-line-soft rounded-xl overflow-hidden shadow-sm">
        <button
          onClick={() => navMes(-1)}
          className="px-3 py-2.5 text-ink-soft hover:text-turquesa-dark hover:bg-turquesa-mist transition"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <span className="px-4 text-[14px] font-medium text-turquesa-dark w-52 text-center">
          {MESES[month]} {year}
        </span>
        <button
          onClick={() => navMes(1)}
          className="px-3 py-2.5 text-ink-soft hover:text-turquesa-dark hover:bg-turquesa-mist transition"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-5 py-2.5 bg-turquesa text-white text-[13px] font-medium rounded-xl hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)]"
      >
        <Printer className="w-4 h-4" strokeWidth={1.5} />
        Descargar PDF
      </button>
    </div>
  );
}
