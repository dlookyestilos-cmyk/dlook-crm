"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Stethoscope,
  FileText,
  Image as ImageIcon,
  Calendar,
  PenLine,
  Check,
} from "lucide-react";
import Drawer, { DrawerCloseButton } from "@/app/_components/drawer";
import { actualizarClienta, actualizarTratamiento } from "../actions";
import type { Clienta } from "./clientas-manager";
import ConsentimientoTab from "./consentimiento-tab";
import FotosTab from "./fotos-tab";
import SesionesTab from "./sesiones-tab";

type TabId = "personal" | "tratamiento" | "consentimiento" | "fotos" | "sesiones" | "notas";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "personal",        label: "Personal",          icon: User },
  { id: "tratamiento",     label: "Tratamiento",       icon: Stethoscope },
  { id: "consentimiento",  label: "Consentimiento",    icon: FileText },
  { id: "fotos",           label: "Fotos del proceso", icon: ImageIcon },
  { id: "sesiones",        label: "Sesiones",          icon: Calendar },
  { id: "notas",           label: "Notas",             icon: PenLine },
];

function getIniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function fechaLarga(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

type Props = {
  open: boolean;
  onClose: () => void;
  clienta: Clienta | null;
  servicioId: string;
  precioSesion: number | null;
  rol: "admin" | "esteticista";
};

export default function Modal360Drawer({ open, onClose, clienta, servicioId, precioSesion, rol }: Props) {
  const [tab, setTab] = useState<TabId>("personal");

  // Resetear a Personal cuando abre con otra clienta
  useEffect(() => {
    if (clienta) setTab("personal");
  }, [clienta?.cs_id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Drawer open={open} onClose={onClose}>
      {clienta && (
        <>
          {/* Watermark */}
          <div className="absolute -right-14 top-32 w-[320px] h-[320px] opacity-[0.05] pointer-events-none z-0">
            <Image
              src="/brand/Silueta.png"
              alt=""
              width={320}
              height={320}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Header */}
          <header className="bg-white px-9 py-6 border-b border-line-soft flex items-center justify-between relative z-10 shrink-0">
            <span className="absolute top-0 left-9 w-20 h-[2px] bg-gold" />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-turquesa text-white flex items-center justify-center font-medium text-[22px] font-cormorant tracking-wider border-[3px] border-white shadow-[0_4px_16px_rgba(26,155,155,0.25)]">
                {getIniciales(clienta.nombre_completo)}
              </div>
              <div>
                <h2 className="font-cormorant text-[26px] text-turquesa-dark leading-tight">
                  {clienta.nombre_completo}
                </h2>
                <div className="text-[12px] text-ink-mute mt-0.5 tracking-wider flex items-center gap-2">
                  {clienta.documento && <span>{clienta.documento}</span>}
                  {clienta.documento && <span>·</span>}
                  <span>Inicio: {fechaLarga(clienta.fecha_inicio)}</span>
                </div>
              </div>
            </div>
            <DrawerCloseButton onClose={onClose} />
          </header>

          {/* Tabs */}
          <nav className="bg-white px-9 flex gap-1 border-b border-line-soft overflow-x-auto relative z-10 shrink-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-4 text-[13px] flex items-center gap-2 whitespace-nowrap border-b-2 transition ${
                    active
                      ? "text-turquesa border-gold font-medium"
                      : "text-ink-soft border-transparent hover:text-turquesa-dark"
                  }`}
                >
                  <Icon className="w-[15px] h-[15px]" strokeWidth={1.5} />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-9 py-8 relative z-10">
            {tab === "personal"       && <PersonalTab     clienta={clienta} servicioId={servicioId} rol={rol} />}
            {tab === "tratamiento"    && <TratamientoTab  clienta={clienta} servicioId={servicioId} />}
            {tab === "consentimiento" && <ConsentimientoTab clienteId={clienta.cliente_id} servicioId={servicioId} />}
            {tab === "fotos"          && <FotosTab          clienteId={clienta.cliente_id} clienteServicioId={clienta.cs_id} servicioId={servicioId} />}
            {tab === "sesiones"       && <SesionesTab clienteServicioId={clienta.cs_id} servicioId={servicioId} precioSugerido={precioSesion} />}
            {tab === "notas"          && <NotasTab        clienta={clienta} servicioId={servicioId} />}
          </div>
        </>
      )}
    </Drawer>
  );
}

/* ====================== TABS ====================== */

function PersonalTab({ clienta, servicioId, rol }: { clienta: Clienta; servicioId: string; rol: "admin" | "esteticista" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = rol === "admin";

  function handleSubmit(formData: FormData) {
    // Esteticistas no pueden editar campos de contacto; preservar valores originales
    if (!isAdmin) {
      formData.set("telefono", clienta.telefono ?? "");
      formData.set("email", clienta.email ?? "");
      formData.set("direccion", clienta.direccion ?? "");
      formData.set("fecha_nacimiento", clienta.fecha_nacimiento ?? "");
    }
    setError(null);
    startTransition(async () => {
      const res = await actualizarClienta(clienta.cliente_id, servicioId, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
      setTimeout(() => setSavedAt(null), 2000);
    });
  }

  return (
    <form action={handleSubmit} key={clienta.cs_id}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Nombre completo *" name="nombre_completo" defaultValue={clienta.nombre_completo} required />
        <Field label="Documento" name="documento" defaultValue={clienta.documento ?? ""} />
        {isAdmin && (
          <>
            <Field label="Teléfono" name="telefono" defaultValue={clienta.telefono ?? ""} />
            <Field label="Correo" name="email" type="email" defaultValue={clienta.email ?? ""} />
            <Field label="Dirección" name="direccion" defaultValue={clienta.direccion ?? ""} colSpan />
            <Field label="Fecha de nacimiento" name="fecha_nacimiento" type="date" defaultValue={clienta.fecha_nacimiento ?? ""} />
            <div />
          </>
        )}
        <Textarea label="Gustos y preferencias" name="gustos_preferencias" defaultValue={clienta.gustos_preferencias ?? ""} colSpan rows={3} />
      </div>
      <Footer error={error} savedAt={savedAt} isPending={isPending} />
    </form>
  );
}

function TratamientoTab({ clienta, servicioId }: { clienta: Clienta; servicioId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await actualizarTratamiento(clienta.cs_id, servicioId, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
      setTimeout(() => setSavedAt(null), 2000);
    });
  }

  const pct = clienta.sesiones_totales > 0
    ? Math.round((clienta.sesiones_completadas / clienta.sesiones_totales) * 100)
    : 0;

  return (
    <form action={handleSubmit} key={clienta.cs_id}>
      <div className="bg-white rounded-2xl border border-line-soft shadow-sm p-6 mb-5">
        <div className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium mb-4">Progreso</div>
        <div className="flex items-center gap-5">
          <div className="font-cormorant text-[44px] font-light text-turquesa-dark leading-none">
            {clienta.sesiones_completadas}
            <span className="text-[22px] text-ink-mute">/{clienta.sesiones_totales}</span>
          </div>
          <div className="flex-1">
            <div className="h-2 bg-crema-deep rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-turquesa to-gold rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-[12px] text-ink-soft font-light mt-2">
              {pct}% completado · {Math.max(0, clienta.sesiones_totales - clienta.sesiones_completadas)} restantes
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Sesiones contratadas" name="sesiones_totales" type="number" min={1} defaultValue={String(clienta.sesiones_totales)} />
        <Field label="Sesiones completadas" name="sesiones_completadas" type="number" min={0} defaultValue={String(clienta.sesiones_completadas)} />
        <Field label="Áreas tratadas" name="areas_tratadas" placeholder="Axilas, Piernas, Bozo (separadas por coma)" defaultValue={clienta.areas_tratadas.join(", ")} colSpan />
        <Select
          label="Estado"
          name="estado"
          defaultValue={clienta.estado}
          options={[
            { value: "activo",     label: "Activa" },
            { value: "pausado",    label: "Pausada" },
            { value: "completado", label: "Completada" },
          ]}
        />
        <div />
        <Textarea label="Notas del tratamiento" name="notas_tratamiento" defaultValue={clienta.notas_tratamiento ?? ""} colSpan rows={4} />
      </div>

      <Footer error={error} savedAt={savedAt} isPending={isPending} />
    </form>
  );
}

function NotasTab({ clienta, servicioId }: { clienta: Clienta; servicioId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    // Reusa actualizarClienta enviando los demás campos sin cambios
    formData.set("nombre_completo", clienta.nombre_completo);
    formData.set("documento", clienta.documento ?? "");
    formData.set("telefono", clienta.telefono ?? "");
    formData.set("email", clienta.email ?? "");
    formData.set("direccion", clienta.direccion ?? "");
    formData.set("fecha_nacimiento", clienta.fecha_nacimiento ?? "");
    formData.set("gustos_preferencias", clienta.gustos_preferencias ?? "");

    setError(null);
    startTransition(async () => {
      const res = await actualizarClienta(clienta.cliente_id, servicioId, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
      setTimeout(() => setSavedAt(null), 2000);
    });
  }

  return (
    <form action={handleSubmit} key={clienta.cs_id}>
      <Textarea
        label="Notas generales de la clienta"
        name="notas_generales"
        defaultValue={clienta.notas_generales ?? ""}
        rows={10}
      />
      <Footer error={error} savedAt={savedAt} isPending={isPending} />
    </form>
  );
}

/* ====================== Helpers ====================== */

function Footer({
  error,
  savedAt,
  isPending,
}: {
  error: string | null;
  savedAt: number | null;
  isPending: boolean;
}) {
  return (
    <>
      {error && (
        <div className="mt-5 bg-rosa-soft/50 border-l-2 border-rosa text-[#8B5454] text-[13px] px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-3 mt-7">
        {savedAt && (
          <span className="flex items-center gap-1.5 text-turquesa text-[13px]">
            <Check className="w-4 h-4" strokeWidth={2} />
            Guardado
          </span>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-turquesa text-white rounded-xl text-[13px] font-medium tracking-wide hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </>
  );
}

function Field({
  label, name, type = "text", placeholder, required, defaultValue, min, colSpan,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  required?: boolean; defaultValue?: string | number; min?: number; colSpan?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-2 ${colSpan ? "md:col-span-2" : ""}`}>
      <span className="text-[10px] font-medium tracking-[2.5px] uppercase text-gold">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        min={min}
        className="bg-white px-4 py-3 rounded-xl border border-line-soft text-[14px] text-ink font-light focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition"
      />
    </label>
  );
}

function Textarea({
  label, name, defaultValue, rows = 3, colSpan,
}: {
  label?: string; name: string; defaultValue?: string; rows?: number; colSpan?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-2 ${colSpan ? "md:col-span-2" : ""}`}>
      {label && (
        <span className="text-[10px] font-medium tracking-[2.5px] uppercase text-gold">{label}</span>
      )}
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="bg-white px-4 py-3 rounded-xl border border-line-soft text-[14px] text-ink font-light leading-relaxed focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition resize-y"
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
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-medium tracking-[2.5px] uppercase text-gold">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="bg-white px-4 py-3 rounded-xl border border-line-soft text-[14px] text-ink font-light focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
