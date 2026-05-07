"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Check, ExternalLink } from "lucide-react";
import { formatCOP } from "@/lib/format";
import { marcarSesionPagada } from "../actions";
import type { SesionFacturacion } from "../page";

type Filter = "all" | "pendiente" | "pagado";

const ESTADO_LABEL: Record<"pagado" | "pendiente", string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
};

const ESTADO_CHIP: Record<"pagado" | "pendiente", string> = {
  pagado: "bg-turquesa-mist text-turquesa-dark",
  pendiente: "bg-gold-mist text-gold-dark",
};

function getIniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function fechaCorta(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function FacturacionTable({ sesiones }: { sesiones: SesionFacturacion[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("pendiente");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sesiones.filter((s) => {
      if (filter !== "all" && s.estado_pago !== filter) return false;
      if (!q) return true;
      return (
        s.cliente_nombre.toLowerCase().includes(q) ||
        (s.cliente_documento ?? "").toLowerCase().includes(q) ||
        s.servicio_nombre.toLowerCase().includes(q)
      );
    });
  }, [sesiones, filter, search]);

  function handleMarcarPagado(s: SesionFacturacion) {
    setError(null);
    startTransition(async () => {
      const res = await marcarSesionPagada(s.id, true);
      if (!res.ok) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  const totalFiltradas = filtradas.reduce((acc, s) => acc + (s.monto ?? 0), 0);

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-line-soft p-1 rounded-xl">
          <FilterTab active={filter === "pendiente"} onClick={() => setFilter("pendiente")}>
            Pendientes
          </FilterTab>
          <FilterTab active={filter === "pagado"} onClick={() => setFilter("pagado")}>
            Pagadas
          </FilterTab>
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
            Todas
          </FilterTab>
        </div>

        <div className="flex items-center gap-2.5 bg-white border border-line px-4 py-2.5 rounded-xl w-[320px] focus-within:border-turquesa focus-within:shadow-[0_0_0_3px_var(--turquesa-mist)] transition">
          <Search className="w-4 h-4 text-ink-mute" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar clienta o servicio…"
            className="bg-transparent outline-none flex-1 text-[13.5px] font-light text-ink"
          />
        </div>
      </div>

      {/* Resumen del filtro */}
      <div className="mb-4 text-[12px] text-ink-soft font-light">
        Mostrando <strong className="text-turquesa-dark font-medium">{filtradas.length}</strong> sesiones ·{" "}
        <strong className="text-turquesa-dark font-medium">{formatCOP(totalFiltradas)}</strong> en total
      </div>

      <div className="bg-white rounded-2xl border border-line-soft overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-crema">
            <tr>
              <Th>Fecha</Th>
              <Th>Clienta</Th>
              <Th>Servicio</Th>
              <Th>Esteticista</Th>
              <Th className="text-right">Monto</Th>
              <Th>Estado</Th>
              <Th className="w-[1%]"></Th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-ink-mute italic text-sm">
                  {sesiones.length === 0
                    ? "Aún no hay sesiones registradas."
                    : "Ninguna sesión coincide con el filtro."}
                </td>
              </tr>
            ) : (
              filtradas.map((s) => (
                <tr key={s.id} className="border-t border-line-soft hover:bg-crema/40 transition">
                  <td className="px-5 py-3.5 text-[13px] font-medium text-turquesa-dark">
                    {fechaCorta(s.fecha)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-turquesa text-white flex items-center justify-center font-medium text-[11px] font-cormorant tracking-wider shrink-0">
                        {getIniciales(s.cliente_nombre)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] text-turquesa-dark font-medium truncate">
                          {s.cliente_nombre}
                        </div>
                        {s.cliente_documento && (
                          <div className="text-[11px] text-ink-mute tracking-wider">
                            {s.cliente_documento}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-ink font-light">
                    {s.servicio_nombre}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-ink-soft font-light">
                    {s.esteticista_nombre ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-cormorant text-[15px] text-turquesa-dark">
                    {s.monto != null ? formatCOP(s.monto) : <span className="text-ink-mute">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block text-[10px] font-medium uppercase tracking-[1.5px] px-3 py-1 rounded-full ${ESTADO_CHIP[s.estado_pago]}`}
                    >
                      {ESTADO_LABEL[s.estado_pago]}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1">
                      {s.estado_pago === "pendiente" && (
                        <button
                          onClick={() => handleMarcarPagado(s)}
                          disabled={isPending}
                          title="Marcar como pagada"
                          className="w-8 h-8 rounded-lg text-turquesa-dark border border-line bg-white flex items-center justify-center hover:border-turquesa hover:bg-turquesa-mist transition disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      )}
                      <a
                        href={`/servicios/${s.servicio_id}?cliente=${s.cs_id}`}
                        title="Ver clienta"
                        className="w-8 h-8 rounded-lg text-turquesa-dark border border-line bg-white flex items-center justify-center hover:border-turquesa hover:bg-turquesa-mist transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="mt-5 bg-rosa-soft/50 border-l-2 border-rosa text-[#8B5454] text-[13px] px-4 py-3 rounded-md">
          {error}
        </div>
      )}
    </>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left px-5 py-3.5 text-[10px] font-medium uppercase tracking-[2px] text-gold ${className}`}>
      {children}
    </th>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-[13px] font-medium transition ${
        active
          ? "bg-turquesa text-white shadow-[0_2px_8px_rgba(26,155,155,0.25)]"
          : "text-ink-soft hover:text-turquesa-dark"
      }`}
    >
      {children}
    </button>
  );
}
