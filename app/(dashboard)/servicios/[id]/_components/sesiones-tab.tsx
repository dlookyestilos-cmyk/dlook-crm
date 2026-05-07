"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, CalendarDays } from "lucide-react";
import { formatCOP } from "@/lib/format";
import {
  listarSesiones,
  registrarSesion,
  actualizarSesion,
  toggleEstadoPago,
  eliminarSesion,
  type SesionView,
} from "../sesiones-actions";

type Props = {
  clienteServicioId: string;
  servicioId: string;
  precioSugerido: number | null;
};

function fechaCorta(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SesionesTab({
  clienteServicioId,
  servicioId,
  precioSugerido,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<SesionView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    setLoading(true);
    setItems(await listarSesiones(clienteServicioId));
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteServicioId]);

  function handleRegistrar(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await registrarSesion(clienteServicioId, servicioId, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShowForm(false);
      await refresh();
      router.refresh();
    });
  }

  function handleActualizar(sesionId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await actualizarSesion(sesionId, clienteServicioId, servicioId, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditingId(null);
      await refresh();
      router.refresh();
    });
  }

  function handleToggle(sesionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await toggleEstadoPago(sesionId, servicioId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await refresh();
      router.refresh();
    });
  }

  function handleDelete(sesionId: string) {
    if (!confirm("¿Eliminar esta sesión? La acción no se puede deshacer.")) return;
    setError(null);
    startTransition(async () => {
      const res = await eliminarSesion(sesionId, clienteServicioId, servicioId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await refresh();
      router.refresh();
    });
  }

  // Resumen
  const total = items?.length ?? 0;
  const pagado = (items ?? [])
    .filter((s) => s.estado_pago === "pagado")
    .reduce((acc, s) => acc + (s.monto ?? 0), 0);
  const pendiente = (items ?? [])
    .filter((s) => s.estado_pago === "pendiente")
    .reduce((acc, s) => acc + (s.monto ?? 0), 0);

  if (loading) {
    return <div className="text-center py-16 text-ink-mute text-sm italic">Cargando…</div>;
  }

  return (
    <>
      {/* Resumen + CTA */}
      <div className="bg-white rounded-2xl border border-line-soft shadow-sm p-6 mb-5">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-8">
            <Stat label="Sesiones" value={String(total)} />
            <Stat label="Cobrado" value={formatCOP(pagado)} accent="turquesa" />
            <Stat label="Pendiente" value={formatCOP(pendiente)} accent="gold" />
          </div>
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setEditingId(null);
            }}
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-turquesa text-white px-5 py-2.5 rounded-xl text-[12px] font-medium hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50"
          >
            {showForm ? <X className="w-4 h-4" strokeWidth={2} /> : <Plus className="w-4 h-4" strokeWidth={2} />}
            {showForm ? "Cancelar" : "Registrar sesión"}
          </button>
        </div>
      </div>

      {/* Form de registrar */}
      {showForm && (
        <div className="bg-turquesa-mist/40 border border-turquesa-soft rounded-2xl p-5 mb-5">
          <SesionForm
            isPending={isPending}
            onCancel={() => setShowForm(false)}
            onSubmit={handleRegistrar}
            defaults={{
              fecha: todayIso(),
              monto: precioSugerido != null ? String(Math.round(precioSugerido)) : "",
              estado_pago: "pendiente",
              notas: "",
            }}
            submitLabel="Registrar"
          />
        </div>
      )}

      {/* Lista */}
      {(items?.length ?? 0) === 0 ? (
        !showForm && (
          <div className="bg-white border border-dashed border-turquesa-soft rounded-2xl p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-turquesa-mist flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-turquesa" strokeWidth={1.5} />
            </div>
            <h4 className="font-cormorant text-[20px] text-turquesa-dark mb-1.5">
              Sin sesiones registradas
            </h4>
            <p className="text-ink-soft text-[13px] font-light max-w-md mx-auto">
              Cada visita queda registrada acá con su monto y estado de pago.
            </p>
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl border border-line-soft overflow-hidden">
          <table className="w-full">
            <thead className="bg-crema">
              <tr>
                <Th>Fecha</Th>
                <Th>Esteticista</Th>
                <Th>Notas</Th>
                <Th className="text-right">Monto</Th>
                <Th>Pago</Th>
                <Th className="w-[1%]"></Th>
              </tr>
            </thead>
            <tbody>
              {items!.map((s) =>
                editingId === s.id ? (
                  <tr key={s.id} className="border-t border-line-soft bg-turquesa-mist/40">
                    <td colSpan={6} className="p-5">
                      <SesionForm
                        isPending={isPending}
                        onCancel={() => setEditingId(null)}
                        onSubmit={(fd) => handleActualizar(s.id, fd)}
                        defaults={{
                          fecha: s.fecha,
                          monto: s.monto != null ? String(Math.round(s.monto)) : "",
                          estado_pago: s.estado_pago,
                          notas: s.notas ?? "",
                        }}
                        submitLabel="Guardar cambios"
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="border-t border-line-soft hover:bg-crema/40 transition">
                    <td className="px-5 py-3.5 text-[13px]">
                      <div className="font-medium text-turquesa-dark">{fechaCorta(s.fecha)}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-ink-soft font-light">
                      {s.realizada_por_nombre ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-ink font-light max-w-[260px]">
                      <div className="line-clamp-2" title={s.notas ?? ""}>
                        {s.notas ?? <span className="text-ink-mute italic">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-right font-cormorant text-[15px] text-turquesa-dark">
                      {s.monto != null ? formatCOP(s.monto) : <span className="text-ink-mute">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggle(s.id)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[1.5px] px-3 py-1 rounded-full hover:opacity-90 transition ${
                          s.estado_pago === "pagado"
                            ? "bg-turquesa-mist text-turquesa-dark"
                            : "bg-gold-mist text-gold-dark"
                        }`}
                        title="Click para cambiar estado"
                      >
                        {s.estado_pago === "pagado" ? "Pagado" : "Pendiente"}
                      </button>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1">
                        <IconButton onClick={() => setEditingId(s.id)} title="Editar">
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(s.id)} title="Eliminar" hoverDanger>
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="mt-5 bg-rosa-soft/50 border-l-2 border-rosa text-[#8B5454] text-[13px] px-4 py-3 rounded-md">
          {error}
        </div>
      )}
    </>
  );
}

/* ====================== Componentes ====================== */

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "turquesa" | "gold";
}) {
  const valueColor =
    accent === "turquesa"
      ? "text-turquesa"
      : accent === "gold"
      ? "text-gold-dark"
      : "text-turquesa-dark";
  return (
    <div>
      <div className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium">
        {label}
      </div>
      <div className={`font-cormorant text-[26px] font-light leading-none mt-1 ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}

function SesionForm({
  isPending,
  onCancel,
  onSubmit,
  defaults,
  submitLabel,
}: {
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
  defaults: {
    fecha: string;
    monto: string;
    estado_pago: "pagado" | "pendiente";
    notas: string;
  };
  submitLabel: string;
}) {
  return (
    <form action={onSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Fecha" name="fecha" type="date" defaultValue={defaults.fecha} required />
        <Field
          label="Monto (COP)"
          name="monto"
          type="number"
          min={0}
          step={1000}
          defaultValue={defaults.monto}
          placeholder="Ej: 90000"
        />
        <Select
          label="Estado pago"
          name="estado_pago"
          defaultValue={defaults.estado_pago}
          options={[
            { value: "pendiente", label: "Pendiente" },
            { value: "pagado", label: "Pagado" },
          ]}
        />
      </div>
      <div className="mt-4">
        <Textarea
          label="Notas de la sesión"
          name="notas"
          defaultValue={defaults.notas}
          rows={2}
          placeholder="Áreas tratadas, observaciones, intensidad…"
        />
      </div>
      <div className="flex items-center justify-end gap-2.5 mt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 bg-white text-turquesa-dark border border-line rounded-lg text-[12px] hover:border-turquesa hover:text-turquesa hover:bg-turquesa-mist transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-turquesa text-white rounded-lg text-[12px] font-medium hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={2} />
          {isPending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left px-5 py-3.5 text-[10px] font-medium uppercase tracking-[2px] text-gold ${className}`}>
      {children}
    </th>
  );
}

function IconButton({
  children,
  onClick,
  title,
  hoverDanger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  hoverDanger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg text-ink-soft border border-line flex items-center justify-center transition ${
        hoverDanger
          ? "hover:border-rosa hover:text-rosa hover:bg-rosa-soft/40"
          : "hover:border-turquesa hover:text-turquesa hover:bg-turquesa-mist"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label, name, type = "text", defaultValue, placeholder, required, min, step,
}: {
  label: string; name: string; type?: string; defaultValue?: string;
  placeholder?: string; required?: boolean; min?: number; step?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium tracking-[2px] uppercase text-gold">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className="bg-white px-3.5 py-2.5 rounded-lg border border-line-soft text-[13px] text-ink font-light focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition"
      />
    </label>
  );
}

function Textarea({
  label, name, defaultValue, rows = 2, placeholder,
}: {
  label?: string; name: string; defaultValue?: string; rows?: number; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-[10px] font-medium tracking-[2px] uppercase text-gold">{label}</span>}
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="bg-white px-3.5 py-2.5 rounded-lg border border-line-soft text-[13px] text-ink font-light focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition resize-y"
      />
    </label>
  );
}

function Select({
  label, name, defaultValue, options,
}: {
  label: string; name: string; defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium tracking-[2px] uppercase text-gold">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="bg-white px-3.5 py-2.5 rounded-lg border border-line-soft text-[13px] text-ink font-light focus:outline-none focus:border-turquesa cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
