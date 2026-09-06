"use client";

import { NIVEL_LABEL, type NivelGeografia } from "@/lib/geo";

const NIVELES: NivelGeografia[] = ["municipio", "local", "federal"];

export function NivelGeografiaToggle({
  value,
  onChange,
}: {
  value: NivelGeografia;
  onChange: (nivel: NivelGeografia) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(28,10,18,0.04),0_10px_24px_-18px_rgba(28,10,18,0.4)]">
      {NIVELES.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === id
              ? "bg-guinda text-white shadow-[0_4px_12px_-4px_rgba(122,18,51,0.5)]"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {NIVEL_LABEL[id]}
        </button>
      ))}
    </div>
  );
}
