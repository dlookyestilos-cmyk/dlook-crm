"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertTriangle } from "lucide-react";
import Drawer, { DrawerCloseButton } from "@/app/_components/drawer";
import { actualizarClientaInfo, type ClientaRow } from "../actions";

type Props = {
  clienta: ClientaRow | null;
  onClose: () => void;
};

export default function EditarClientaDrawer({ clienta, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [nombre,    setNombre]    = useState("");
  const [documento, setDocumento] = useState("");
  const [telefono,  setTelefono]  = useState("");
  const [email,     setEmail]     = useState("");
  const [direccion, setDireccion] = useState("");
  const [fechaNac,  setFechaNac]  = useState("");
  const [gustos,    setGustos]    = useState("");
  const [notas,     setNotas]     = useState("");

  useEffect(() => {
    if (!clienta) return;
    setError(null);
    setSavedAt(null);
    setNombre(clienta.nombre_completo);
    setDocumento(clienta.documento ?? "");
    setTelefono(clienta.telefono ?? "");
    setEmail(clienta.email ?? "");
    setDireccion(clienta.direccion ?? "");
    setFechaNac(clienta.fecha_nacimiento ?? "");
    setGustos(clienta.gustos_preferencias ?? "");
    setNotas(clienta.notas_generales ?? "");
  }, [clienta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save(marcarCompleta: boolean) {
    if (!clienta) return;
    if (!nombre.trim()) { setError("El nombre es requerido."); return; }
    setError(null);

    startTransition(async () => {
      const res = await actualizarClientaInfo(clienta.id, {
        nombre_completo:     nombre.trim(),
        documento:           documento.trim() || null,
        telefono:            telefono.trim() || null,
        email:               email.trim() || null,
        direccion:           direccion.trim() || null,
        fecha_nacimiento:    fechaNac || null,
        gustos_preferencias: gustos.trim() || null,
        notas_generales:     notas.trim() || null,
        ...(marcarCompleta ? { pendiente_datos: false } : {}),
      });
      if (!res.ok) { setError(res.error); return; }
      setSavedAt(Date.now());
      router.refresh();
      setTimeout(() => { setSavedAt(null); onClose(); }, 900);
    });
  }

  return (
    <Drawer open={clienta !== null} onClose={onClose}>
      {clienta && (
        <>
          {/* Header */}
          <header className="bg-white px-9 py-6 border-b border-line-soft flex items-center justify-between shrink-0 relative">
            <span className="absolute top-0 left-9 w-20 h-[2px] bg-gold" />
            <div>
              <div className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium mb-0.5">
                Ficha de clienta
              </div>
              <h2 className="font-cormorant text-[26px] text-turquesa-dark font-light leading-tight">
                {clienta.nombre_completo}
              </h2>
            </div>
            <DrawerCloseButton onClose={onClose} />
          </header>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto px-9 py-8 min-h-0">

              {/* Alerta datos pendientes */}
              {clienta.pendiente_datos && (
                <div className="mb-6 flex items-start gap-3 bg-[#FFF8ED] border border-gold/30 rounded-xl px-5 py-4">
                  <AlertTriangle className="w-4 h-4 text-gold mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div className="text-[12.5px] text-gold-dark">
                    Esta clienta fue creada automáticamente desde Google Calendar.
                    Completa sus datos y usa &ldquo;Marcar como completa&rdquo; al guardar.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nombre */}
                <div className="md:col-span-2">
                  <Label>Nombre completo *</Label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className={INPUT}
                    placeholder="Nombre y apellidos"
                  />
                </div>

                {/* Documento */}
                <div>
                  <Label>Documento de identidad</Label>
                  <input
                    type="text"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    className={INPUT}
                    placeholder="CC, CE…"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <Label>Teléfono</Label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className={INPUT}
                    placeholder="3XX XXX XXXX"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label>Email</Label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={INPUT}
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                {/* Fecha nacimiento */}
                <div>
                  <Label>Fecha de nacimiento</Label>
                  <input
                    type="date"
                    value={fechaNac}
                    onChange={(e) => setFechaNac(e.target.value)}
                    className={INPUT}
                  />
                </div>

                {/* Dirección */}
                <div className="md:col-span-2">
                  <Label>Dirección</Label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className={INPUT}
                    placeholder="Barrio, ciudad…"
                  />
                </div>

                {/* Gustos */}
                <div className="md:col-span-2">
                  <Label>Gustos y preferencias</Label>
                  <textarea
                    rows={3}
                    value={gustos}
                    onChange={(e) => setGustos(e.target.value)}
                    placeholder="Qué le gusta, qué no le gusta, preferencias de tratamiento…"
                    className={TEXTAREA}
                  />
                </div>

                {/* Notas */}
                <div className="md:col-span-2">
                  <Label>Notas generales</Label>
                  <textarea
                    rows={3}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Observaciones internas, alergias, condiciones…"
                    className={TEXTAREA}
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
              <div className="flex items-center justify-end gap-3 flex-wrap">
                {savedAt && (
                  <span className="flex items-center gap-1.5 text-turquesa text-[13px]">
                    <Check className="w-4 h-4" strokeWidth={2} />
                    Guardado
                  </span>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="px-5 py-2.5 border border-line text-ink-soft rounded-xl text-[13px] hover:border-turquesa hover:text-turquesa-dark transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                {clienta.pendiente_datos && (
                  <button
                    type="button"
                    onClick={() => save(true)}
                    disabled={isPending}
                    className="px-6 py-2.5 bg-gold text-white rounded-xl text-[13px] font-medium hover:bg-gold-dark transition shadow-[0_4px_12px_rgba(200,160,60,0.3)] disabled:opacity-50"
                  >
                    {isPending ? "Guardando…" : "Marcar como completa"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => save(false)}
                  disabled={isPending}
                  className="px-6 py-2.5 bg-turquesa text-white rounded-xl text-[13px] font-medium hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50"
                >
                  {isPending ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
}

const INPUT =
  "w-full bg-white px-4 py-3 rounded-xl border border-line-soft text-[14px] text-ink font-light focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition";

const TEXTAREA =
  "w-full bg-white px-4 py-3 rounded-xl border border-line-soft text-[14px] text-ink font-light focus:outline-none focus:border-turquesa focus:shadow-[0_0_0_3px_var(--turquesa-mist)] transition resize-y";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] font-medium tracking-[2.5px] uppercase text-gold mb-2">
      {children}
    </span>
  );
}
