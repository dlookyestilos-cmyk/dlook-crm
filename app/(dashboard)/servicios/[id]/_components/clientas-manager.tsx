"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Search, Users } from "lucide-react";
import NuevaClientaDrawer from "./nueva-clienta-drawer";
import Modal360Drawer from "./modal-360-drawer";

export type Clienta = {
  cs_id: string;
  cliente_id: string;
  nombre_completo: string;
  documento: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
  gustos_preferencias: string | null;
  notas_generales: string | null;
  areas_tratadas: string[];
  sesiones_totales: number;
  sesiones_completadas: number;
  estado: "activo" | "pausado" | "completado";
  notas_tratamiento: string | null;
  fecha_inicio: string;
};

type Props = {
  servicioId: string;
  servicioNombre: string;
  lineaNombre: string;
  precioSesion: number | null;
  clientas: Clienta[];
  rol: "admin" | "esteticista";
};

const ESTADO_LABEL: Record<Clienta["estado"], string> = {
  activo: "Activa",
  pausado: "Pausada",
  completado: "Completada",
};

const ESTADO_CHIP: Record<Clienta["estado"], string> = {
  activo: "bg-turquesa-mist text-turquesa-dark",
  pausado: "bg-gold-mist text-gold-dark",
  completado: "bg-rosa-soft text-[#B07878]",
};

function getIniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function ClientasManager({
  servicioId,
  servicioNombre,
  precioSesion,
  clientas,
  rol,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const csIdFromUrl = searchParams.get("cliente");

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<"all" | Clienta["estado"]>("all");
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [seleccionada, setSeleccionada] = useState<Clienta | null>(null);

  // Auto-abrir modal al llegar con ?cliente=xxx (desde la búsqueda global)
  useEffect(() => {
    if (!csIdFromUrl) return;
    const c = clientas.find((c) => c.cs_id === csIdFromUrl);
    if (c) setSeleccionada(c);
  }, [csIdFromUrl, clientas]);

  function closeModal360() {
    setSeleccionada(null);
    // Limpiar el query param para que al refrescar no reabra
    if (csIdFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("cliente");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clientas.filter((c) => {
      if (estadoFilter !== "all" && c.estado !== estadoFilter) return false;
      if (!q) return true;
      return (
        c.nombre_completo.toLowerCase().includes(q) ||
        (c.documento ?? "").toLowerCase().includes(q)
      );
    });
  }, [clientas, search, estadoFilter]);

  const empty = clientas.length === 0;

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-7 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2.5 bg-white border border-line px-4 py-2.5 rounded-xl w-[320px] focus-within:border-turquesa focus-within:shadow-[0_0_0_3px_var(--turquesa-mist)] transition">
            <Search className="w-4 h-4 text-ink-mute" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              className="bg-transparent outline-none flex-1 text-[13.5px] font-light text-ink"
            />
          </div>

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as typeof estadoFilter)}
            className="bg-white border border-line px-4 py-2.5 rounded-xl text-[13.5px] font-light text-ink hover:border-turquesa transition outline-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Activas</option>
            <option value="pausado">Pausadas</option>
            <option value="completado">Completadas</option>
          </select>
        </div>

        <button
          onClick={() => setNuevaOpen(true)}
          className="bg-turquesa text-white px-6 py-3 rounded-xl text-[13px] font-medium tracking-wide flex items-center gap-2 hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] hover:shadow-[0_8px_20px_rgba(26,155,155,0.35)] hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Nueva clienta
        </button>
      </div>

      {/* Tabla o empty state */}
      {empty ? (
        <EmptyState onClick={() => setNuevaOpen(true)} />
      ) : (
        <div className="bg-white rounded-[20px] border border-line-soft shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-crema">
              <tr>
                <Th>Clienta</Th>
                <Th>Sesiones</Th>
                <Th>Áreas</Th>
                <Th>Estado</Th>
                <Th>Última actividad</Th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-14 text-ink-mute italic text-sm">
                    Ninguna clienta coincide con la búsqueda.
                  </td>
                </tr>
              ) : (
                filtradas.map((c) => {
                  const pct =
                    c.sesiones_totales > 0
                      ? Math.round((c.sesiones_completadas / c.sesiones_totales) * 100)
                      : 0;
                  return (
                    <tr
                      key={c.cs_id}
                      onClick={() => setSeleccionada(c)}
                      className="border-t border-line-soft cursor-pointer hover:bg-turquesa-mist/60 transition"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-turquesa text-white flex items-center justify-center font-medium text-[13px] font-cormorant tracking-wider shrink-0">
                            {getIniciales(c.nombre_completo)}
                          </div>
                          <div>
                            <div className="font-medium text-turquesa-dark text-[14px]">
                              {c.nombre_completo}
                            </div>
                            {c.documento && (
                              <div className="text-[11px] text-ink-mute mt-0.5 tracking-wider">
                                {c.documento}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[110px] h-[5px] bg-crema-deep rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-turquesa to-gold rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-cormorant text-ink-soft min-w-[32px]">
                            {c.sesiones_completadas}/{c.sesiones_totales}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {c.areas_tratadas.length === 0 ? (
                            <span className="text-ink-mute text-[12px] italic">—</span>
                          ) : (
                            c.areas_tratadas.slice(0, 2).map((a) => (
                              <span
                                key={a}
                                className="bg-crema border border-gold text-gold-dark text-[11px] px-2.5 py-0.5 rounded-full"
                              >
                                {a}
                              </span>
                            ))
                          )}
                          {c.areas_tratadas.length > 2 && (
                            <span className="text-ink-mute text-[11px]">
                              +{c.areas_tratadas.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block text-[10px] font-medium uppercase tracking-[1.5px] px-3 py-1 rounded-full ${ESTADO_CHIP[c.estado]}`}
                        >
                          {ESTADO_LABEL[c.estado]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-ink font-light">
                        {fechaCorta(c.fecha_inicio)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer Nueva clienta */}
      <NuevaClientaDrawer
        open={nuevaOpen}
        onClose={() => setNuevaOpen(false)}
        servicioId={servicioId}
        servicioNombre={servicioNombre}
      />

      {/* Drawer 360 */}
      <Modal360Drawer
        open={seleccionada !== null}
        onClose={closeModal360}
        clienta={seleccionada}
        servicioId={servicioId}
        precioSesion={precioSesion}
        rol={rol}
      />
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-5 py-4 text-[10px] font-medium uppercase tracking-[2px] text-gold">
      {children}
    </th>
  );
}

function EmptyState({ onClick }: { onClick: () => void }) {
  return (
    <div className="bg-white border border-dashed border-turquesa-soft rounded-[20px] py-16 px-8 text-center">
      <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-turquesa-mist flex items-center justify-center">
        <Users className="w-7 h-7 text-turquesa" strokeWidth={1.5} />
      </div>
      <h3 className="font-cormorant text-[24px] text-turquesa-dark mb-2">
        Aún no hay clientas
      </h3>
      <p className="text-ink-soft text-[14px] font-light max-w-md mx-auto mb-6">
        Cuando agregues una clienta a este servicio, aparecerá aquí con su progreso de
        sesiones y datos personales.
      </p>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 bg-turquesa text-white px-6 py-3 rounded-xl text-[13px] font-medium hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)]"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
        Agregar primera clienta
      </button>
    </div>
  );
}
