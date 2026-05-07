"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Search } from "lucide-react";
import Drawer, { DrawerCloseButton } from "@/app/_components/drawer";
import { crearCita, actualizarCita } from "../actions";
import type { Cita, AgendaServicio, AgendaCliente, AgendaPerfil } from "../page";

function bogotaDate(fechaHora: string): string {
  const ms = new Date(fechaHora).getTime() - 5 * 60 * 60 * 1000;
  const b  = new Date(ms);
  return `${b.getUTCFullYear()}-${String(b.getUTCMonth() + 1).padStart(2, "0")}-${String(b.getUTCDate()).padStart(2, "0")}`;
}

function bogotaHora(fechaHora: string): string {
  const ms = new Date(fechaHora).getTime() - 5 * 60 * 60 * 1000;
  const b  = new Date(ms);
  return `${String(b.getUTCHours()).padStart(2, "0")}:${String(b.getUTCMinutes()).padStart(2, "0")}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  servicios: AgendaServicio[];
  clientas: AgendaCliente[];
  perfiles: AgendaPerfil[];
  defaultFecha: string;
  editCita: Cita | null;
  esAdmin: boolean;
  userId: string;
};

const DURACIONES = [
  { value: "30",  label: "30 min" },
  { value: "45",  label: "45 min" },
  { value: "60",  label: "1 hora" },
  { value: "90",  label: "1 h 30 min" },
  { value: "120", label: "2 horas" },
];

export default function NuevaCitaDrawer({
  open, onClose, servicios, clientas, perfiles, defaultFecha, editCita, esAdmin, userId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error,   setError]   = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isEdit = editCita !== null;

  const [selectedCliente, setSelectedCliente] = useState<AgendaCliente | null>(null);
  const [fecha,      setFecha]     = useState("");
  const [hora,       setHora]      = useState("09:00");
  const [duracion,   setDuracion]  = useState("60");
  const [servicio,   setServicio]  = useState("");
  const [asignadaA, setAsignadaA] = useState<string>("");
  const [estado,     setEstado]    = useState<Cita["estado"]>("agendada");
  const [notas,      setNotas]     = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSavedAt(null);
    if (isEdit && editCita) {
      setFecha(bogotaDate(editCita.fecha_hora));
      setHora(bogotaHora(editCita.fecha_hora));
      setDuracion(String(editCita.duracion_minutos));
      setServicio(editCita.servicio_id ?? "");
      setAsignadaA(editCita.asignada_a ?? (esAdmin ? "" : userId));
      setEstado(editCita.estado);
      setNotas(editCita.notas ?? "");
      setSelectedCliente(clientas.find((c) => c.id === editCita.cliente_id) ?? null);
    } else {
      setFecha(defaultFecha);
      setHora("09:00");
      setDuracion("60");
      setServicio("");
      setAsignadaA(esAdmin ? "" : userId); // esteticista se auto-asigna
      setEstado("agendada");
      setNotas("");
      setSelectedCliente(null);
    }
  }, [open, isEdit, editCita?.id, defaultFecha]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedCliente) { setError("Selecciona una clienta."); return; }
    if (!fecha || !hora)   { setError("Fecha y hora son requeridas."); return; }
    setError(null);

    const fd = new FormData();
    fd.set("cliente_id",       selectedCliente.id);
    fd.set("fecha",            fecha);
    fd.set("hora",             hora);
    fd.set("servicio_id",      servicio);
    fd.set("asignada_a",       asignadaA);
    fd.set("duracion_minutos", duracion);
    fd.set("estado",           estado);
    fd.set("notas",            notas);

    startTransition(async () => {
      const res = isEdit
        ? await actualizarCita(editCita!.id, fd)
        : await crearCita(fd);
      if (!res.ok) { setError(res.error); return; }
      setSavedAt(Date.now());
      router.refresh();
      setTimeout(() => { setSavedAt(null); onClose(); }, 900);
    });
  }

  return (
    <Drawer open={open} onClose={onClose}>
      {/* Header */}
      <header className="bg-white px-9 py-6 border-b border-line-soft flex items-center justify-between shrink-0 relative">
        <span className="absolute top-0 left-9 w-20 h-[2px] bg-gold" />
        <div>
          <div className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium mb-0.5">
            {isEdit ? "Editar cita" : "Nueva cita"}
          </div>
          <h2 className="font-cormorant text-[26px] text-turquesa-dark font-light">
            {isEdit ? "Modificar cita agendada" : "Agendar una cita"}
          </h2>
        </div>
        <DrawerCloseButton onClose={onClose} />
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Campos */}
        <div className="flex-1 overflow-y-auto px-9 py-8 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Clienta */}
            <div className="md:col-span-2">
              <Label>Clienta *</Label>
              <ClienteSelector clientas={clientas} value={selectedCliente} onChange={setSelectedCliente} />
            </div>

            {/* Fecha */}
            <div>
              <Label>Fecha *</Label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className={INPUT} />
            </div>

            {/* Hora */}
            <div>
              <Label>Hora *</Label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required className={INPUT} />
            </div>

            {/* Asignada a — solo admin */}
            {esAdmin && (
              <div>
                <Label>Asignada a</Label>
                <select value={asignadaA} onChange={(e) => setAsignadaA(e.target.value)} className={INPUT + " cursor-pointer"}>
                  <option value="">— Sin asignar —</option>
                  {perfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.rol === "admin" ? "(Admin)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Servicio */}
            <div>
              <Label>Servicio</Label>
              <select value={servicio} onChange={(e) => setServicio(e.target.value)} className={INPUT + " cursor-pointer"}>
                <option value="">— Sin especificar —</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>

            {/* Duración */}
            <div>
              <Label>Duración</Label>
              <select value={duracion} onChange={(e) => setDuracion(e.target.value)} className={INPUT + " cursor-pointer"}>
                {DURACIONES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Estado (solo edición) */}
            {isEdit && (
              <div>
                <Label>Estado</Label>
                <select value={estado} onChange={(e) => setEstado(e.target.value as Cita["estado"])} className={INPUT + " cursor-pointer"}>
                  <option value="agendada">Agendada</option>
                  <option value="realizada">Realizada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            )}

            {/* Notas */}
            <div className="md:col-span-2">
              <Label>Notas</Label>
              <textarea
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones, preparación, etc."
                className="w-full bg-white px-4 py-3 rounded-xl border border-line-soft text-[14px] text-ink font-light focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition resize-y"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-9 pb-8 pt-4 border-t border-line-soft bg-white shrink-0">
          {error && (
            <div className="mb-4 bg-rosa-soft/50 border-l-2 border-rosa text-[#8B5454] text-[13px] px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            {savedAt && (
              <span className="flex items-center gap-1.5 text-turquesa text-[13px]">
                <Check className="w-4 h-4" strokeWidth={2} />
                {isEdit ? "Cita actualizada" : "Cita agendada"}
              </span>
            )}
            <button type="button" onClick={onClose} disabled={isPending}
              className="px-5 py-2.5 border border-line text-ink-soft rounded-xl text-[13px] hover:border-turquesa hover:text-turquesa-dark transition disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="px-6 py-2.5 bg-turquesa text-white rounded-xl text-[13px] font-medium hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50">
              {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Agendar cita"}
            </button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}

/* ============================
   Cliente selector
   ============================ */

function ClienteSelector({
  clientas, value, onChange,
}: {
  clientas: AgendaCliente[];
  value: AgendaCliente | null;
  onChange: (c: AgendaCliente) => void;
}) {
  const [search, setSearch] = useState("");
  const [open,   setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value?.nombre_completo ?? ""); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return clientas.slice(0, 8);
    const q = search.toLowerCase();
    return clientas.filter(
      (c) => c.nombre_completo.toLowerCase().includes(q) || (c.documento ?? "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [clientas, search]);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2.5 bg-white border border-line-soft px-4 py-3 rounded-xl focus-within:border-turquesa focus-within:shadow-[0_0_0_3px_var(--turquesa-mist)] transition">
        <Search className="w-4 h-4 text-ink-mute shrink-0" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          placeholder="Buscar clienta por nombre o documento…"
          className="bg-transparent outline-none flex-1 text-[14px] font-light text-ink"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-line-soft rounded-xl shadow-lg overflow-hidden">
          {filtered.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(c); setSearch(c.nombre_completo); setOpen(false); }}
              className="w-full text-left px-4 py-3 hover:bg-turquesa-mist transition">
              <div className="text-[13px] font-medium text-turquesa-dark">{c.nombre_completo}</div>
              {c.documento && <div className="text-[11px] text-ink-mute">{c.documento}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const INPUT = "w-full bg-white px-4 py-3 rounded-xl border border-line-soft text-[14px] text-ink font-light focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10px] font-medium tracking-[2.5px] uppercase text-gold mb-2">{children}</span>;
}
