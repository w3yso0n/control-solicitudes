"use client";

import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export function MunicipioSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (cveMun: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");

  const municipios = useMemo(
    () =>
      [...MUNICIPIOS_GUERRERO].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es"),
      ),
    [],
  );

  const seleccionado = municipios.find((m) => m.cveMun === value);

  const filtrados = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return municipios;
    return municipios.filter(
      (m) =>
        m.nombre.toLowerCase().includes(needle) ||
        m.corto.toLowerCase().includes(needle) ||
        m.region.toLowerCase().includes(needle),
    );
  }, [municipios, q]);

  useEffect(() => {
    if (!abierto) return;
    searchRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setAbierto(false);
        setQ("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={listId}
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-2xl border bg-white px-3.5 py-2.5 text-left text-sm outline-none ring-magenta/30 transition-shadow focus:ring-2 ${
          abierto
            ? "border-guinda/40 ring-2 ring-magenta/30"
            : "border-zinc-200 hover:border-zinc-300"
        }`}
      >
        <span className="min-w-0 truncate">
          {seleccionado ? (
            <>
              <span className="font-medium text-zinc-900">
                {seleccionado.nombre}
              </span>
              <span className="ml-1.5 text-zinc-400">{seleccionado.region}</span>
            </>
          ) : (
            <span className="text-zinc-400">Elegir municipio</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-zinc-400 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto ? (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_12px_40px_-12px_rgba(28,10,18,0.35)]">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2.5">
            <Search size={14} className="shrink-0 text-zinc-400" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar municipio o región…"
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            className="max-h-56 overflow-y-auto overscroll-contain py-1"
          >
            {filtrados.map((m) => {
              const activo = m.cveMun === value;
              return (
                <li key={m.cveMun} role="option" aria-selected={activo}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(m.cveMun);
                      setAbierto(false);
                      setQ("");
                    }}
                    className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors ${
                      activo
                        ? "bg-guinda/8 text-guinda"
                        : "text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {m.nombre}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-400">
                      {m.region}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtrados.length === 0 ? (
              <li className="px-3.5 py-6 text-center text-sm text-zinc-400">
                Sin coincidencias
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
