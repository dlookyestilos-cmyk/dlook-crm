"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import {
  listarFotos,
  subirFotos,
  eliminarFoto,
  type FotoView,
} from "../storage-actions";

type Props = {
  clienteId: string;
  clienteServicioId: string;
  servicioId: string;
};

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function FotosTab({ clienteId, clienteServicioId, servicioId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<FotoView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<FotoView | null>(null);

  async function refresh() {
    setLoading(true);
    const data = await listarFotos(clienteId);
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const sesion = prompt("¿Número de sesión? (vacío si no aplica)", "") ?? "";

    setError(null);
    const formData = new FormData();
    for (const f of Array.from(files)) {
      formData.append("files", f);
    }
    if (sesion.trim()) formData.append("numero_sesion", sesion.trim());

    startTransition(async () => {
      const res = await subirFotos(clienteId, clienteServicioId, servicioId, formData);
      if (!res.ok) {
        setError(res.error);
      } else {
        await refresh();
        router.refresh();
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDelete(fotoId: string) {
    if (!confirm("¿Eliminar esta foto?")) return;
    setError(null);
    startTransition(async () => {
      const res = await eliminarFoto(fotoId, servicioId);
      if (!res.ok) {
        setError(res.error);
      } else {
        await refresh();
        router.refresh();
        if (lightbox?.id === fotoId) setLightbox(null);
      }
    });
  }

  if (loading) {
    return <div className="text-center py-16 text-ink-mute text-sm italic">Cargando galería…</div>;
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />

      <div className="flex items-center justify-between mb-5">
        <h3 className="font-cormorant text-[22px] text-turquesa-dark">
          Galería del proceso
        </h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-turquesa text-white px-5 py-2.5 rounded-xl text-[12px] font-medium hover:bg-turquesa-dark transition shadow-[0_4px_12px_rgba(26,155,155,0.25)] disabled:opacity-50"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          {isPending ? "Subiendo…" : "Subir fotos"}
        </button>
      </div>

      {(items?.length ?? 0) === 0 ? (
        <div className="bg-white border border-dashed border-turquesa-soft rounded-2xl p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-turquesa-mist flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-turquesa" strokeWidth={1.5} />
          </div>
          <h4 className="font-cormorant text-[20px] text-turquesa-dark mb-1.5">
            Sin fotos aún
          </h4>
          <p className="text-ink-soft text-[13px] font-light max-w-md mx-auto">
            Documentá el progreso de la clienta sesión por sesión. Subí fotos antes y
            después para ver la evolución.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items!.map((f) => (
            <div
              key={f.id}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
            >
              <button
                onClick={() => setLightbox(f)}
                className="block w-full aspect-[4/5] overflow-hidden cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.signed_url}
                  alt={f.numero_sesion ? `Sesión ${f.numero_sesion}` : "Foto del proceso"}
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Label superpuesto */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-turquesa-deep/70 to-transparent p-3 pointer-events-none">
                {f.numero_sesion != null && (
                  <div className="text-white text-[12px] font-cormorant tracking-wide">
                    Sesión {f.numero_sesion}
                  </div>
                )}
                <div className="text-white/80 text-[10px] tracking-wider mt-0.5">
                  {fechaCorta(f.fecha)}
                </div>
              </div>

              {/* Botón eliminar (visible al hover) */}
              <button
                onClick={() => handleDelete(f.id)}
                disabled={isPending}
                className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white text-rosa rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm disabled:opacity-40"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
              </button>
            </div>
          ))}

          {/* Tile para agregar más */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="aspect-[4/5] bg-white border border-dashed border-turquesa-soft rounded-2xl flex flex-col items-center justify-center gap-2 text-ink-mute hover:border-turquesa hover:text-turquesa transition disabled:opacity-50"
          >
            <Plus className="w-7 h-7" strokeWidth={1.2} />
            <span className="text-[11px] tracking-wider uppercase">Agregar foto</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mt-5 bg-rosa-soft/50 border-l-2 border-rosa text-[#8B5454] text-[13px] px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-turquesa-deep/85 backdrop-blur-md z-[200] flex items-center justify-center p-8"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/15 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.signed_url}
              alt=""
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="text-center text-white">
              {lightbox.numero_sesion != null && (
                <div className="font-cormorant text-2xl">Sesión {lightbox.numero_sesion}</div>
              )}
              <div className="text-white/70 text-sm tracking-wider mt-1">
                {fechaCorta(lightbox.fecha)}
              </div>
              {lightbox.notas && (
                <p className="text-white/80 text-sm mt-2 max-w-xl">{lightbox.notas}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
