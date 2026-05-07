"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download, RefreshCw, Trash2, Upload, ShieldCheck } from "lucide-react";
import {
  listarConsentimientos,
  subirConsentimiento,
  eliminarConsentimiento,
  type ConsentimientoView,
} from "../storage-actions";

type Props = {
  clienteId: string;
  servicioId: string;
};

function fechaLarga(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export default function ConsentimientoTab({ clienteId, servicioId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ConsentimientoView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const data = await listarConsentimientos(clienteId);
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await subirConsentimiento(clienteId, servicioId, formData);
      if (!res.ok) {
        setError(res.error);
      } else {
        await refresh();
        router.refresh();
      }
      // Reset el input para que onChange dispare otra vez con el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleDelete(consentimientoId: string) {
    if (!confirm("¿Eliminar este consentimiento? La acción no se puede deshacer.")) return;
    setError(null);
    startTransition(async () => {
      const res = await eliminarConsentimiento(consentimientoId, servicioId);
      if (!res.ok) {
        setError(res.error);
      } else {
        await refresh();
        router.refresh();
      }
    });
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-ink-mute text-sm italic">Cargando…</div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {(items?.length ?? 0) === 0 ? (
        // Empty state — drop zone
        <div className="bg-white border border-dashed border-turquesa-soft rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-turquesa-mist flex items-center justify-center">
            <FileText className="w-7 h-7 text-turquesa" strokeWidth={1.5} />
          </div>
          <h3 className="font-cormorant text-[22px] text-turquesa-dark mb-1.5">
            Sin consentimiento aún
          </h3>
          <p className="text-ink-soft text-[13px] font-light max-w-md mx-auto mb-6">
            Subí el PDF firmado del consentimiento informado. Se guarda privado y solo
            personal autorizado puede descargarlo.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-turquesa text-white px-6 py-3 rounded-xl text-[13px] font-medium hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            {isPending ? "Subiendo…" : "Subir PDF"}
          </button>
        </div>
      ) : (
        // Lista de consentimientos
        <div className="space-y-3">
          {items!.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-line-soft rounded-2xl p-5 flex items-center gap-5 hover:border-turquesa-soft transition"
            >
              <div className="w-14 h-16 rounded-md bg-gradient-to-br from-rosa to-gold-light flex items-end justify-center pb-2 shrink-0 shadow-sm relative overflow-hidden">
                <span
                  className="absolute top-0 right-0 w-4 h-4 bg-white"
                  style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }}
                />
                <span className="text-white font-cormorant text-[11px] font-medium tracking-wider">
                  PDF
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-cormorant text-[17px] text-turquesa-dark truncate">
                  {c.nombre_archivo}
                </div>
                <div className="text-[12px] text-ink-mute mt-0.5">
                  Firmado el {fechaLarga(c.fecha_firma)}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={c.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-white text-turquesa-dark border border-line rounded-xl text-[12px] font-medium hover:border-turquesa hover:text-turquesa hover:bg-turquesa-mist transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Ver / Descargar
                </a>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                  className="px-4 py-2.5 bg-white text-turquesa-dark border border-line rounded-xl text-[12px] font-medium hover:border-turquesa hover:text-turquesa hover:bg-turquesa-mist transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Subir uno nuevo"
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Reemplazar
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={isPending}
                  className="w-10 h-10 bg-white text-rosa border border-line rounded-xl hover:border-rosa hover:bg-rosa-soft/40 transition flex items-center justify-center disabled:opacity-50"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-5 bg-rosa-soft/50 border-l-2 border-rosa text-[#8B5454] text-[13px] px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="mt-6 bg-turquesa-mist/60 border-l-2 border-gold px-5 py-4 rounded-md flex gap-3">
        <ShieldCheck className="w-4 h-4 text-turquesa shrink-0 mt-0.5" strokeWidth={1.8} />
        <p className="text-[12px] text-ink-soft font-light leading-relaxed">
          <strong className="text-turquesa-dark font-medium">Privacidad:</strong> Este
          documento es confidencial. Solo personal autorizado puede acceder. Los enlaces
          de descarga expiran en 1 hora.
        </p>
      </div>
    </>
  );
}
