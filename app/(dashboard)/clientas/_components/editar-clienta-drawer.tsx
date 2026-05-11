"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertTriangle, Plus, ArrowRight, Loader2, Stethoscope } from "lucide-react";
import Link from "next/link";
import Drawer, { DrawerCloseButton } from "@/app/_components/drawer";
import {
  actualizarClientaInfo,
  obtenerServiciosCliente,
  asignarServicioACliente,
  type ClientaRow,
  type ServicioBasico,
  type ClientaServicioRow,
} from "../actions";

type Props = {
  clienta: ClientaRow | null;
  servicios: ServicioBasico[];
  onClose: () => void;
};

const ESTADO_CHIP: Record<ClientaServicioRow["estado"], string> = {
  activo:     "bg-turquesa-mist text-turquesa-dark",
  pausado:    "bg-gold-mist text-gold-dark",
  completado: "bg-rosa-soft text-[#B07878]",
};
const ESTADO_LABEL: Record<ClientaServicioRow["estado"], string> = {
  activo:     "Activo",
  pausado:    "Pausado",
  completado: "Completado",
};

export default function EditarClientaDrawer({ clienta, servicios, onClose }: Props) {
  const router = useRouter();

  // ── Datos personales ────────────────────────────────────
  const [isPending, startTransition] = useTransition();
  const [error,   setError]   = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [nombre,    setNombre]    = useState("");
  const [documento, setDocumento] = useState("");
  const [telefono,  setTelefono]  = useState("");
  const [email,     setEmail]     = useState("");
  const [direccion, setDireccion] = useState("");
  const [fechaNac,  setFechaNac]  = useState("");
  const [gustos,    setGustos]    = useState("");
  const [notas,     setNotas]     = useState("");

  // ── Tratamientos ────────────────────────────────────────
  const [tratamientos, setTratamientos] = useState<ClientaServicioRow[]>([]);
  const [loadingTrats, startLoadTrats]  = useTransition();
  const [showAddForm,  setShowAddForm]  = useState(false);

  // Add-form state
  const [addServicioId,  setAddServicioId]  = useState("");
  const [addSesiones,    setAddSesiones]    = useState(1);
  const [addAreas,       setAddAreas]       = useState("");
  const [addPending,     startAddTransition] = useTransition();
  const [addError,       setAddError]       = useState<string | null>(null);
  const [addedInfo,      setAddedInfo]      = useState<{ cs_id: string; servicio_id: string; nombre: string } | null>(null);

  // ── Inicialización al abrir el drawer ───────────────────
  useEffect(() => {
    if (!clienta) {
      setTratamientos([]);
      setShowAddForm(false);
      setAddedInfo(null);
      return;
    }
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

    // Cargar tratamientos
    setShowAddForm(false);
    setAddedInfo(null);
    setAddServicioId(servicios[0]?.id ?? "");
    setAddSesiones(1);
    setAddAreas("");
    setAddError(null);
    startLoadTrats(async () => {
      const data = await obtenerServiciosCliente(clienta.id);
      setTratamientos(data);
    });
  }, [clienta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guardar datos personales ─────────────────────────────
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

  // ── Agregar tratamiento ───────────────────────────────────
  function handleAddServicio() {
    if (!clienta || !addServicioId) return;
    setAddError(null);
    startAddTransition(async () => {
      const areas = addAreas.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await asignarServicioACliente(clienta.id, addServicioId, addSesiones, areas);
      if (!res.ok) { setAddError(res.error); return; }
      const svc = servicios.find((s) => s.id === addServicioId);
      setAddedInfo({ cs_id: res.cs_id, servicio_id: res.servicio_id, nombre: svc?.nombre ?? "Servicio" });
      setShowAddForm(false);
      // Refrescar lista de tratamientos
      startLoadTrats(async () => {
        if (!clienta) return;
        const data = await obtenerServiciosCliente(clienta.id);
        setTratamientos(data);
      });
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

              {/* ── Datos personales ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Label>Nombre completo *</Label>
                  <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                    className={INPUT} placeholder="Nombre y apellidos" />
                </div>
                <div>
                  <Label>Documento de identidad</Label>
                  <input type="text" value={documento} onChange={(e) => setDocumento(e.target.value)}
                    className={INPUT} placeholder="CC, CE…" />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                    className={INPUT} placeholder="3XX XXX XXXX" />
                </div>
                <div>
                  <Label>Email</Label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className={INPUT} placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <Label>Fecha de nacimiento</Label>
                  <input type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)}
                    className={INPUT} />
                </div>
                <div className="md:col-span-2">
                  <Label>Dirección</Label>
                  <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)}
                    className={INPUT} placeholder="Barrio, ciudad…" />
                </div>
                <div className="md:col-span-2">
                  <Label>Gustos y preferencias</Label>
                  <textarea rows={3} value={gustos} onChange={(e) => setGustos(e.target.value)}
                    placeholder="Qué le gusta, qué no le gusta, preferencias de tratamiento…"
                    className={TEXTAREA} />
                </div>
                <div className="md:col-span-2">
                  <Label>Notas generales</Label>
                  <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)}
                    placeholder="Observaciones internas, alergias, condiciones…"
                    className={TEXTAREA} />
                </div>
              </div>

              {/* ── Tratamientos ── */}
              <div className="mt-8 pt-8 border-t border-line-soft">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-turquesa" strokeWidth={1.5} />
                    <span className="text-[10px] tracking-[2.5px] uppercase text-gold font-medium">
                      Tratamientos
                    </span>
                  </div>
                  {!showAddForm && !addedInfo && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-1.5 text-[12px] text-turquesa-dark hover:text-turquesa font-medium transition"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                      Agregar tratamiento
                    </button>
                  )}
                </div>

                {/* Tratamiento recién agregado */}
                {addedInfo && (
                  <div className="mb-4 flex items-center justify-between bg-turquesa-mist border border-turquesa/20 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-turquesa-dark text-[13px]">
                      <Check className="w-4 h-4" strokeWidth={2} />
                      <span className="font-medium">{addedInfo.nombre}</span> agregado correctamente
                    </div>
                    <Link
                      href={`/servicios/${addedInfo.servicio_id}?cliente=${addedInfo.cs_id}`}
                      className="flex items-center gap-1 text-[12px] text-turquesa font-medium hover:underline"
                    >
                      Ir al tratamiento <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                    </Link>
                  </div>
                )}

                {/* Formulario agregar */}
                {showAddForm && (
                  <div className="mb-4 bg-crema border border-line-soft rounded-xl p-5">
                    <div className="text-[11px] tracking-[2px] uppercase text-ink-mute font-medium mb-4">
                      Nuevo tratamiento
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Servicio *</Label>
                        <select
                          value={addServicioId}
                          onChange={(e) => setAddServicioId(e.target.value)}
                          className={INPUT + " cursor-pointer"}
                        >
                          <option value="">— Selecciona un servicio —</option>
                          {servicios.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Sesiones totales</Label>
                        <input
                          type="number"
                          min={1}
                          value={addSesiones}
                          onChange={(e) => setAddSesiones(Math.max(1, parseInt(e.target.value) || 1))}
                          className={INPUT}
                        />
                      </div>
                      <div>
                        <Label>Áreas tratadas (opcional)</Label>
                        <input
                          type="text"
                          value={addAreas}
                          onChange={(e) => setAddAreas(e.target.value)}
                          placeholder="Abdomen, muslos… (separados por coma)"
                          className={INPUT}
                        />
                      </div>
                    </div>
                    {addError && (
                      <div className="mt-3 text-[12px] text-[#8B5454] bg-rosa-soft/40 px-3 py-2 rounded-lg">
                        {addError}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => { setShowAddForm(false); setAddError(null); }}
                        disabled={addPending}
                        className="px-4 py-2 text-[12px] text-ink-soft border border-line rounded-xl hover:border-turquesa hover:text-turquesa-dark transition disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddServicio}
                        disabled={addPending || !addServicioId}
                        className="flex items-center gap-2 px-5 py-2 bg-turquesa text-white text-[12px] font-medium rounded-xl hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50"
                      >
                        {addPending && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />}
                        {addPending ? "Agregando…" : "Agregar tratamiento"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de tratamientos existentes */}
                {loadingTrats ? (
                  <div className="flex items-center gap-2 text-ink-mute text-[13px] py-2">
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                    Cargando tratamientos…
                  </div>
                ) : tratamientos.length === 0 ? (
                  <p className="text-[13px] text-ink-mute italic py-2">
                    Sin tratamientos asignados aún.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tratamientos.map((t) => (
                      <div
                        key={t.cs_id}
                        className="flex items-center justify-between bg-white border border-line-soft rounded-xl px-4 py-3"
                      >
                        <div>
                          <div className="text-[13.5px] font-medium text-turquesa-dark">
                            {t.servicio_nombre}
                          </div>
                          <div className="text-[11px] text-ink-mute mt-0.5">
                            {t.sesiones_completadas}/{t.sesiones_totales} sesiones
                            {t.areas_tratadas.length > 0 && ` · ${t.areas_tratadas.join(", ")}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[9.5px] font-medium uppercase tracking-[1.5px] px-2 py-0.5 rounded-full ${ESTADO_CHIP[t.estado]}`}>
                            {ESTADO_LABEL[t.estado]}
                          </span>
                          <Link
                            href={`/servicios/${t.servicio_id}?cliente=${t.cs_id}`}
                            className="text-[11px] text-turquesa hover:underline flex items-center gap-0.5"
                            onClick={onClose}
                          >
                            Ver <ArrowRight className="w-3 h-3" strokeWidth={2} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                <button type="button" onClick={onClose} disabled={isPending}
                  className="px-5 py-2.5 border border-line text-ink-soft rounded-xl text-[13px] hover:border-turquesa hover:text-turquesa-dark transition disabled:opacity-50">
                  Cancelar
                </button>
                {clienta.pendiente_datos && (
                  <button type="button" onClick={() => save(true)} disabled={isPending}
                    className="px-6 py-2.5 bg-gold text-white rounded-xl text-[13px] font-medium hover:bg-gold-dark transition shadow-[0_4px_12px_rgba(200,160,60,0.3)] disabled:opacity-50">
                    {isPending ? "Guardando…" : "Marcar como completa"}
                  </button>
                )}
                <button type="button" onClick={() => save(false)} disabled={isPending}
                  className="px-6 py-2.5 bg-turquesa text-white rounded-xl text-[13px] font-medium hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50">
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
