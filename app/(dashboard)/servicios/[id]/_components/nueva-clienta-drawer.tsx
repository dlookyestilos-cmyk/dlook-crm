"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Drawer, { DrawerCloseButton } from "@/app/_components/drawer";
import { crearClienta } from "../actions";

type Props = {
  open: boolean;
  onClose: () => void;
  servicioId: string;
  servicioNombre: string;
};

export default function NuevaClientaDrawer({
  open,
  onClose,
  servicioId,
  servicioNombre,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await crearClienta(servicioId, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <header className="bg-white px-9 py-6 border-b border-line-soft flex items-center justify-between relative shrink-0">
        <span className="absolute top-0 left-9 w-20 h-[2px] bg-gold" />
        <div>
          <span className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium">
            Nueva clienta
          </span>
          <h2 className="font-cormorant text-[26px] text-turquesa-dark mt-0.5 leading-tight">
            {servicioNombre}
          </h2>
        </div>
        <DrawerCloseButton onClose={onClose} />
      </header>

      <form
        action={handleSubmit}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto px-9 py-7">
          <Section title="Datos personales">
            <Grid>
              <Field label="Nombre completo *" name="nombre_completo" required />
              <Field label="Documento" name="documento" placeholder="CC 1.020.456.789" />
              <Field label="Teléfono" name="telefono" placeholder="+57 304 567 8901" />
              <Field label="Correo" name="email" type="email" />
              <Field label="Dirección" name="direccion" colSpan />
              <Field label="Fecha de nacimiento" name="fecha_nacimiento" type="date" />
            </Grid>
            <div className="mt-5">
              <Textarea
                label="Gustos y preferencias"
                name="gustos_preferencias"
                placeholder="Música suave, prefiere las mañanas, alérgica a..."
                rows={3}
              />
            </div>
          </Section>

          <div className="my-7 h-px bg-line-soft" />

          <Section title="Plan de tratamiento">
            <Grid>
              <Field
                label="Sesiones contratadas"
                name="sesiones_totales"
                type="number"
                min={1}
                defaultValue={1}
              />
              <div />
              <Field
                label="Áreas a tratar"
                name="areas_tratadas"
                placeholder="Axilas, Piernas, Bozo (separadas por coma)"
                colSpan
              />
            </Grid>
          </Section>

          <Section title="Notas generales" className="mt-7">
            <Textarea
              name="notas_generales"
              placeholder="Cualquier dato útil sobre la clienta..."
              rows={4}
            />
          </Section>

          {error && (
            <div className="mt-6 bg-rosa-soft/50 border-l-2 border-rosa text-[#8B5454] text-[13px] px-4 py-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Footer fijo */}
        <div className="bg-white border-t border-line-soft px-9 py-5 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-5 py-2.5 bg-white text-turquesa-dark border border-line rounded-xl text-[13px] hover:border-turquesa hover:text-turquesa hover:bg-turquesa-mist transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 bg-turquesa text-white rounded-xl text-[13px] font-medium tracking-wide hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50"
          >
            {isPending ? "Creando…" : "Crear clienta"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

/* ============== Helpers de form ============== */

function Section({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {title && (
        <h3 className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
  min,
  colSpan,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  min?: number;
  colSpan?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-2 ${colSpan ? "md:col-span-2" : ""}`}>
      <span className="text-[10px] font-medium tracking-[2.5px] uppercase text-gold">
        {label}
      </span>
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
  label,
  name,
  placeholder,
  rows = 3,
}: {
  label?: string;
  name: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-2">
      {label && (
        <span className="text-[10px] font-medium tracking-[2.5px] uppercase text-gold">
          {label}
        </span>
      )}
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="bg-white px-4 py-3 rounded-xl border border-line-soft text-[14px] text-ink font-light leading-relaxed focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition resize-y"
      />
    </label>
  );
}
