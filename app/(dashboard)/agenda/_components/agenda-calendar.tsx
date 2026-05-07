"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Pencil, Trash2, RefreshCw } from "lucide-react";
import type { Cita, AgendaServicio, AgendaCliente, AgendaPerfil } from "../page";
import NuevaCitaDrawer from "./nueva-cita-drawer";
import { eliminarCita, sincronizarDesdeGcal } from "../actions";

/* ============================
   Utilidades de fecha / hora
   ============================ */

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bogotaDateKey(fechaHora: string): string {
  const ms = new Date(fechaHora).getTime() - 5 * 60 * 60 * 1000;
  const b  = new Date(ms);
  return `${b.getUTCFullYear()}-${String(b.getUTCMonth() + 1).padStart(2, "0")}-${String(b.getUTCDate()).padStart(2, "0")}`;
}

function formatHoraCita(fechaHora: string): string {
  const ms = new Date(fechaHora).getTime() - 5 * 60 * 60 * 1000;
  const b  = new Date(ms);
  const h  = b.getUTCHours(), m = b.getUTCMinutes();
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function mesLabel(year: number, month: number): string {
  const raw = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" })
    .format(new Date(year, month, 1));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function prevMesParam(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMesParam(year: number, month: number): string {
  const d = new Date(year, month + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function diaLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const raw = new Intl.DateTimeFormat("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(y, m - 1, d));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function iniciales(nombre: string | null): string {
  if (!nombre) return "?";
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

/* ============================
   Colores
   ============================ */

const CATEGORIA_CHIP: Record<string, string> = {
  laser:    "bg-turquesa-mist text-turquesa-dark",
  corporal: "bg-gold-mist text-gold-dark",
  facial:   "bg-rosa-soft text-[#B07878]",
  masajes:  "bg-[#EDF4F7] text-[#4A7890]",
  rostro:   "bg-rosa-soft text-[#B07878]",
};

const CATEGORIA_DOT: Record<string, string> = {
  laser:    "bg-turquesa",
  corporal: "bg-gold",
  facial:   "bg-rosa",
  masajes:  "bg-[#4A7890]",
  rostro:   "bg-rosa",
};

const ESTADO_CHIP: Record<Cita["estado"], string> = {
  agendada:  "bg-gold-mist text-gold-dark",
  realizada: "bg-turquesa-mist text-turquesa-dark",
  cancelada: "bg-[#F2F2F2] text-ink-mute",
};

const ESTADO_LABEL: Record<Cita["estado"], string> = {
  agendada:  "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

/* ============================
   Calendario
   ============================ */

type CalDay = { date: Date; dateKey: string; currentMonth: boolean; isToday: boolean };

function buildCalendarDays(year: number, month: number): CalDay[] {
  const todayKey = isoDate(new Date());
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const offset   = (first.getDay() + 6) % 7;
  const days: CalDay[] = [];

  for (let i = offset; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    const k = isoDate(d);
    days.push({ date: d, dateKey: k, currentMonth: false, isToday: k === todayKey });
  }
  for (let n = 1; n <= last.getDate(); n++) {
    const d = new Date(year, month, n);
    const k = isoDate(d);
    days.push({ date: d, dateKey: k, currentMonth: true, isToday: k === todayKey });
  }
  let next = 1;
  while (days.length < 42) {
    const d = new Date(year, month + 1, next++);
    const k = isoDate(d);
    days.push({ date: d, dateKey: k, currentMonth: false, isToday: k === todayKey });
  }
  return days;
}

/* ============================
   Componente principal
   ============================ */

type Props = {
  citas: Cita[];
  servicios: AgendaServicio[];
  clientas: AgendaCliente[];
  perfiles: AgendaPerfil[];
  year: number;
  month: number;
  esAdmin: boolean;
  userId: string;
};

export default function AgendaCalendar({ citas, servicios, clientas, perfiles, year, month, esAdmin, userId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedDay, setSelectedDay]   = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editCita, setEditCita]         = useState<Cita | null>(null);
  const [defaultFecha, setDefaultFecha] = useState(isoDate(new Date()));
  const [filtroEst, setFiltroEst]       = useState<string>("all");
  const [syncMsg, setSyncMsg]           = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  // Filtro de esteticista (solo admin)
  const citasFiltradas = useMemo(() =>
    esAdmin && filtroEst !== "all"
      ? citas.filter((c) => c.asignada_a === filtroEst)
      : citas,
    [citas, filtroEst, esAdmin]
  );

  const citasByDate = useMemo(() => {
    const map = new Map<string, Cita[]>();
    for (const cita of citasFiltradas) {
      const key = bogotaDateKey(cita.fecha_hora);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cita);
    }
    return map;
  }, [citasFiltradas]);

  const calendarDays = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const selectedDayCitas = selectedDay ? (citasByDate.get(selectedDay) ?? []) : [];

  function openNueva(fecha: string) {
    setEditCita(null);
    setDefaultFecha(fecha);
    setDrawerOpen(true);
  }

  function openEditar(cita: Cita) {
    setEditCita(cita);
    setDrawerOpen(true);
  }

  function handleEliminar(citaId: string) {
    if (!confirm("¿Eliminar esta cita? Se borrará también de Google Calendar.")) return;
    setDeleteError(null);
    startTransition(async () => {
      const res = await eliminarCita(citaId);
      if (!res.ok) { setDeleteError(res.error); return; }
      router.refresh();
    });
  }

  function handleSync() {
    setSyncMsg(null);
    startTransition(async () => {
      const res = await sincronizarDesdeGcal(year, month);
      if (!res.ok) { setSyncMsg(`Error: ${res.error}`); return; }
      const msg = res.actualizadas + res.importadas === 0
        ? "Todo al día — sin cambios nuevos."
        : `${res.importadas} importada${res.importadas !== 1 ? "s" : ""}, ${res.actualizadas} actualizada${res.actualizadas !== 1 ? "s" : ""}.`;
      setSyncMsg(msg);
      router.refresh();
      setTimeout(() => setSyncMsg(null), 5000);
    });
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        {/* Navegación de mes */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/agenda?mes=${prevMesParam(year, month)}`)}
            className="w-9 h-9 rounded-xl border border-line bg-white flex items-center justify-center text-ink-soft hover:border-turquesa hover:text-turquesa-dark transition"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.8} />
          </button>
          <h2 className="font-cormorant text-[26px] font-light text-turquesa-dark capitalize min-w-[210px] text-center">
            {mesLabel(year, month)}
          </h2>
          <button
            onClick={() => router.push(`/agenda?mes=${nextMesParam(year, month)}`)}
            className="w-9 h-9 rounded-xl border border-line bg-white flex items-center justify-center text-ink-soft hover:border-turquesa hover:text-turquesa-dark transition"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSync}
            disabled={isPending}
            title="Sincronizar desde Google Calendar"
            className="flex items-center gap-1.5 border border-line bg-white text-ink-soft px-4 py-2.5 rounded-xl text-[12px] font-medium hover:border-turquesa hover:text-turquesa-dark transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} strokeWidth={1.8} />
            Sync GCal
          </button>
          <button
            onClick={() => openNueva(isoDate(new Date()))}
            className="bg-turquesa text-white px-5 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)]"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Nueva cita
          </button>
        </div>
      </div>

      {/* ── Filtro esteticista (solo admin) ── */}
      {esAdmin && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFiltroEst("all")}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition ${
              filtroEst === "all"
                ? "bg-turquesa text-white shadow-[0_2px_8px_rgba(26,155,155,0.25)]"
                : "bg-white border border-line text-ink-soft hover:text-turquesa-dark hover:border-turquesa"
            }`}
          >
            Todas
          </button>
          {perfiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setFiltroEst(p.id)}
              className={`px-4 py-2 rounded-lg text-[12px] font-medium transition flex items-center gap-2 ${
                filtroEst === p.id
                  ? "bg-turquesa text-white shadow-[0_2px_8px_rgba(26,155,155,0.25)]"
                  : "bg-white border border-line text-ink-soft hover:text-turquesa-dark hover:border-turquesa"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                filtroEst === p.id ? "bg-white/20 text-white" : "bg-turquesa-mist text-turquesa-dark"
              }`}>
                {iniciales(p.nombre)}
              </span>
              {p.nombre}
              <span className="text-[10px] opacity-70">
                {p.rol === "admin" ? "Admin" : "Est."}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Mensajes ── */}
      {syncMsg && (
        <div className={`mb-4 text-[13px] px-4 py-3 rounded-md border-l-2 ${
          syncMsg.startsWith("Error")
            ? "bg-rosa-soft/50 border-rosa text-[#8B5454]"
            : "bg-turquesa-mist border-turquesa text-turquesa-dark"
        }`}>
          {syncMsg}
        </div>
      )}
      {deleteError && (
        <div className="mb-4 bg-rosa-soft/50 border-l-2 border-rosa text-[#8B5454] text-[13px] px-4 py-3 rounded-md">
          {deleteError}
        </div>
      )}

      {/* ── Calendario ── */}
      <div className="bg-white rounded-2xl border border-line-soft overflow-hidden shadow-sm mb-6">
        {/* Encabezados de días */}
        <div className="grid grid-cols-7 border-b border-line-soft">
          {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d) => (
            <div key={d} className="py-3 text-center text-[10px] font-medium tracking-[2px] uppercase text-gold">
              {d}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dayCitas  = citasByDate.get(day.dateKey) ?? [];
            const isSelected = selectedDay === day.dateKey;
            return (
              <DayCell
                key={i}
                day={day}
                citas={dayCitas}
                isSelected={isSelected}
                onClick={() => setSelectedDay((prev) => prev === day.dateKey ? null : day.dateKey)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Panel de día seleccionado ── */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-line-soft shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-line-soft bg-crema">
            <div>
              <div className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium mb-0.5">Citas del día</div>
              <div className="font-cormorant text-[20px] text-turquesa-dark font-light capitalize">
                {diaLabel(selectedDay)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openNueva(selectedDay)}
                className="flex items-center gap-1.5 bg-turquesa text-white px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-turquesa-dark transition shadow-[0_2px_8px_rgba(26,155,155,0.25)]"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                Agendar
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-8 h-8 rounded-lg border border-line text-ink-mute flex items-center justify-center hover:border-turquesa hover:text-turquesa-dark transition"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>

          {selectedDayCitas.length === 0 ? (
            <div className="py-12 text-center text-ink-mute italic text-sm">
              No hay citas para este día.{" "}
              <button onClick={() => openNueva(selectedDay)} className="text-turquesa underline not-italic">
                Agendar una
              </button>
            </div>
          ) : (
            <div className="divide-y divide-line-soft">
              {selectedDayCitas.map((cita) => (
                <CitaRow
                  key={cita.id}
                  cita={cita}
                  esAdmin={esAdmin}
                  onEdit={() => openEditar(cita)}
                  onDelete={() => handleEliminar(cita.id)}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Drawer ── */}
      <NuevaCitaDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditCita(null); }}
        servicios={servicios}
        clientas={clientas}
        perfiles={perfiles}
        defaultFecha={defaultFecha}
        editCita={editCita}
        esAdmin={esAdmin}
        userId={userId}
      />
    </>
  );
}

/* ============================
   Day cell
   ============================ */

function DayCell({ day, citas, isSelected, onClick }: {
  day: CalDay; citas: Cita[]; isSelected: boolean; onClick: () => void;
}) {
  const visible  = citas.slice(0, 2);
  const overflow = citas.length - 2;

  return (
    <div
      onClick={onClick}
      className={`min-h-[110px] p-2 border-r border-b border-line-soft cursor-pointer transition
        ${!day.currentMonth ? "opacity-40" : ""}
        ${isSelected ? "bg-turquesa-mist/20 ring-1 ring-inset ring-turquesa/30" : "hover:bg-crema/60"}
      `}
    >
      <div className="mb-1.5">
        <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-[13px] font-medium ${
          day.isToday ? "bg-turquesa text-white" : isSelected ? "bg-gold text-white" : "text-ink-soft"
        }`}>
          {day.date.getDate()}
        </span>
      </div>
      <div className="space-y-0.5">
        {visible.map((cita) => (
          <div
            key={cita.id}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] leading-tight truncate
              ${CATEGORIA_CHIP[cita.servicio_categoria ?? ""] ?? "bg-crema text-ink-soft"}
              ${cita.estado === "cancelada" ? "opacity-50 line-through" : ""}
            `}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CATEGORIA_DOT[cita.servicio_categoria ?? ""] ?? "bg-ink-mute"}`} />
            <span className="truncate">
              {formatHoraCita(cita.fecha_hora)} {cita.cliente_nombre.split(" ")[0]}
            </span>
          </div>
        ))}
        {overflow > 0 && <div className="text-[10px] text-ink-mute px-1">+{overflow} más</div>}
      </div>
    </div>
  );
}

/* ============================
   Cita row (panel de día)
   ============================ */

function CitaRow({ cita, esAdmin, onEdit, onDelete, isPending }: {
  cita: Cita; esAdmin: boolean; onEdit: () => void; onDelete: () => void; isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-crema/30 transition">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-turquesa-dark min-w-[80px] shrink-0">
        <Clock className="w-3.5 h-3.5 text-turquesa-dark/60" strokeWidth={1.8} />
        {formatHoraCita(cita.fecha_hora)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-[14px] text-turquesa-dark truncate">{cita.cliente_nombre}</div>
        <div className="text-[12px] text-ink-soft font-light flex items-center gap-2 flex-wrap">
          {cita.servicio_nombre && <span>{cita.servicio_nombre}</span>}
          {cita.servicio_nombre && <span>·</span>}
          <span>{cita.duracion_minutos} min</span>
          {esAdmin && cita.asignada_nombre && (
            <>
              <span>·</span>
              <span className="text-turquesa-dark/70">{cita.asignada_nombre}</span>
            </>
          )}
        </div>
        {cita.notas && (
          <div className="text-[11px] text-ink-mute mt-0.5 line-clamp-1">{cita.notas}</div>
        )}
      </div>

      <span className={`text-[10px] font-medium uppercase tracking-[1.5px] px-3 py-1 rounded-full shrink-0 ${ESTADO_CHIP[cita.estado]}`}>
        {ESTADO_LABEL[cita.estado]}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} title="Editar"
          className="w-8 h-8 rounded-lg border border-line text-ink-soft flex items-center justify-center hover:border-turquesa hover:text-turquesa hover:bg-turquesa-mist transition">
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
        <button onClick={onDelete} disabled={isPending} title="Eliminar"
          className="w-8 h-8 rounded-lg border border-line text-ink-soft flex items-center justify-center hover:border-rosa hover:text-rosa hover:bg-rosa-soft/40 transition disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
