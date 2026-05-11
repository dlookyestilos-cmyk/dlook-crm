"use client";

import { useMemo, useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import type { ClientaRow, ServicioBasico } from "../actions";
import EditarClientaDrawer from "./editar-clienta-drawer";

function getIniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

type Filter = "todas" | "pendientes";

export default function ClientasList({
  clientas,
  servicios,
  selectedId,
}: {
  clientas: ClientaRow[];
  servicios: ServicioBasico[];
  selectedId?: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const [drawerClienta, setDrawerClienta] = useState<ClientaRow | null>(
    selectedId ? (clientas.find((c) => c.id === selectedId) ?? null) : null
  );

  const pendientesCount = clientas.filter((c) => c.pendiente_datos).length;

  const filtered = useMemo(() => {
    let list = clientas;
    if (filter === "pendientes") list = list.filter((c) => c.pendiente_datos);
    if (search.trim().length >= 2) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.nombre_completo.toLowerCase().includes(q) ||
          (c.documento ?? "").toLowerCase().includes(q) ||
          (c.telefono ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [clientas, search, filter]);

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium mb-0.5">
            Base de datos
          </div>
          <h1 className="font-cormorant text-[36px] text-turquesa-dark font-light leading-none">
            Clientas
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[32px] font-cormorant text-turquesa-dark font-light leading-none">
            {clientas.length}
          </div>
          <div className="text-[11px] text-ink-mute mt-0.5">registradas</div>
        </div>
      </div>

      {/* Alerta datos pendientes */}
      {pendientesCount > 0 && (
        <div className="mb-6 flex items-start gap-3 bg-[#FFF8ED] border border-gold/30 rounded-xl px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-gold mt-0.5 shrink-0" strokeWidth={1.5} />
          <div>
            <div className="text-[13px] font-medium text-gold-dark">
              {pendientesCount}{" "}
              {pendientesCount === 1 ? "clienta tiene" : "clientas tienen"} datos pendientes
            </div>
            <div className="text-[11.5px] text-ink-mute mt-0.5">
              Creadas automáticamente desde Google Calendar. Haz clic en su fila para completar su
              información.
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap mb-5">
        <div className="flex items-center gap-2.5 bg-white border border-line-soft focus-within:border-turquesa focus-within:shadow-[0_0_0_3px_var(--turquesa-mist)] px-4 py-2.5 rounded-xl transition flex-1 min-w-[200px] max-w-[380px]">
          <Search className="w-4 h-4 text-ink-mute shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, documento, teléfono…"
            className="bg-transparent outline-none text-[13.5px] text-ink font-light flex-1 placeholder:text-ink-mute"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["todas", "pendientes"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[12px] font-medium transition ${
                filter === f
                  ? "bg-turquesa text-white shadow-[0_4px_12px_rgba(26,155,155,0.25)]"
                  : "bg-white border border-line-soft text-ink-soft hover:border-turquesa hover:text-turquesa-dark"
              }`}
            >
              {f === "todas" ? "Todas" : `Datos pendientes (${pendientesCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-mute text-[14px] italic">
          {search.trim().length >= 2
            ? `No se encontró ninguna clienta con "${search}".`
            : filter === "pendientes"
            ? "No hay clientas con datos pendientes. ¡Todo al día!"
            : "No hay clientas registradas aún."}
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl border border-line-soft overflow-hidden shadow-sm overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 380px)", minHeight: "200px" }}
        >
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-line-soft bg-crema">
                <th className="text-left px-6 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium">
                  Nombre
                </th>
                <th className="text-left px-4 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium hidden md:table-cell">
                  Documento
                </th>
                <th className="text-left px-4 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium hidden md:table-cell">
                  Teléfono
                </th>
                <th className="text-left px-4 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium hidden lg:table-cell">
                  Email
                </th>
                <th className="px-4 py-3.5 text-[10px] tracking-[2px] uppercase text-ink-mute font-medium text-right">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setDrawerClienta(c)}
                  className="border-t border-line-soft first:border-t-0 cursor-pointer transition hover:bg-turquesa-mist"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-turquesa text-white flex items-center justify-center text-[12px] font-medium font-cormorant tracking-wider shrink-0">
                        {getIniciales(c.nombre_completo)}
                      </div>
                      <span className="font-medium text-[13.5px] text-turquesa-dark">
                        {c.nombre_completo}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[13px] text-ink-soft hidden md:table-cell">
                    {c.documento ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-[13px] text-ink-soft hidden md:table-cell">
                    {c.telefono ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-[13px] text-ink-soft hidden lg:table-cell">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {c.pendiente_datos ? (
                      <span className="inline-flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[1.5px] px-2.5 py-1 rounded-full bg-gold-mist text-gold-dark">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                        Pendiente
                      </span>
                    ) : (
                      <span className="inline-block text-[9.5px] font-medium uppercase tracking-[1.5px] px-2.5 py-1 rounded-full bg-turquesa-mist text-turquesa-dark">
                        Completa
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditarClientaDrawer
        clienta={drawerClienta}
        servicios={servicios}
        onClose={() => setDrawerClienta(null)}
      />
    </>
  );
}
