"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { buscarClientas, type SearchResult } from "../_actions/buscar-clientas";

const ESTADO_LABEL: Record<SearchResult["estado"], string> = {
  activo:          "Activa",
  pausado:         "Pausada",
  completado:      "Completa",
  sin_tratamiento: "Sin tratamiento",
};

const ESTADO_CHIP: Record<SearchResult["estado"], string> = {
  activo:          "bg-turquesa-mist text-turquesa-dark",
  pausado:         "bg-gold-mist text-gold-dark",
  completado:      "bg-rosa-soft text-[#B07878]",
  sin_tratamiento: "bg-crema-deep text-ink-soft",
};

function getIniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export default function TopbarSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [isSearching, startSearch] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => {
      startSearch(async () => {
        const data = await buscarClientas(q);
        setResults(data);
        setOpen(true);
        setHighlightedIdx(0);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function selectResult(r: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    if (r.cs_id && r.servicio_id) {
      router.push(`/servicios/${r.servicio_id}?cliente=${r.cs_id}`);
    } else {
      router.push(`/clientas?id=${r.cliente_id}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectResult(results[highlightedIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-[280px] hidden md:block">
      <div className="flex items-center gap-2.5 bg-crema border border-transparent focus-within:border-turquesa-soft focus-within:bg-white px-4 py-[9px] rounded-xl transition">
        {isSearching ? (
          <Loader2 className="w-4 h-4 text-turquesa animate-spin" strokeWidth={1.5} />
        ) : (
          <Search className="w-4 h-4 text-ink-mute" strokeWidth={1.5} />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar clienta…"
          className="bg-transparent outline-none text-[13.5px] text-ink font-light flex-1 placeholder:text-ink-mute"
        />
        <kbd className="hidden lg:inline text-[10px] text-ink-mute border border-line px-1.5 py-0.5 rounded font-mono tracking-wider">
          Ctrl K
        </kbd>
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-[0_12px_32px_rgba(14,95,95,0.14)] border border-line-soft z-50 overflow-hidden max-h-[440px] overflow-y-auto">
          {results.length === 0 && !isSearching && (
            <div className="px-5 py-6 text-center text-ink-mute text-[13px] italic">
              No se encontró ninguna clienta con &ldquo;{query}&rdquo;.
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="px-4 py-2.5 text-[10px] tracking-[2px] uppercase text-gold font-medium border-b border-line-soft bg-crema">
                {results.length} {results.length === 1 ? "resultado" : "resultados"}
              </div>
              <ul>
                {results.map((r, idx) => {
                  const highlighted = idx === highlightedIdx;
                  const pct =
                    r.sesiones_totales > 0
                      ? Math.round((r.sesiones_completadas / r.sesiones_totales) * 100)
                      : 0;
                  return (
                    <li key={r.cs_id ?? r.cliente_id}>
                      <button
                        onMouseEnter={() => setHighlightedIdx(idx)}
                        onClick={() => selectResult(r)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3.5 border-t border-line-soft first:border-t-0 transition ${
                          highlighted ? "bg-turquesa-mist" : "hover:bg-crema"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-turquesa text-white flex items-center justify-center font-medium text-[12px] font-cormorant tracking-wider shrink-0">
                          {getIniciales(r.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-turquesa-dark text-[13.5px] truncate">
                            {r.nombre}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-ink-mute truncate">
                              {r.servicio_nombre ?? "Sin tratamiento activo"}
                            </span>
                            {r.sesiones_totales > 0 && (
                              <>
                                <span className="text-line">·</span>
                                <span className="text-[11px] text-ink-soft font-cormorant">
                                  {r.sesiones_completadas}/{r.sesiones_totales}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {r.pendiente_datos ? (
                            <span className="text-[9.5px] font-medium uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-gold-mist text-gold-dark">
                              Pendiente
                            </span>
                          ) : (
                            <span
                              className={`text-[9.5px] font-medium uppercase tracking-[1.5px] px-2 py-0.5 rounded-full ${ESTADO_CHIP[r.estado]}`}
                            >
                              {ESTADO_LABEL[r.estado]}
                            </span>
                          )}
                          {r.sesiones_totales > 0 && (
                            <div className="w-16 h-1 bg-crema-deep rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-turquesa to-gold rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
