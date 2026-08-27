"use client";

import { Field, Input } from "@/components/ui";

export const EVENTO_NO_APLICA = "No aplica";

export function etiquetaEvento(valor: string | null | undefined) {
  const nombre = valor?.trim() ?? "";
  return nombre || EVENTO_NO_APLICA;
}

export function EventoOrigenField({
  value,
  onChange,
  recientes,
}: {
  value: string;
  onChange: (value: string) => void;
  recientes: string[];
}) {
  const opciones = [
    EVENTO_NO_APLICA,
    ...recientes.filter((r) => r.toLowerCase() !== EVENTO_NO_APLICA.toLowerCase()),
  ];

  return (
    <Field label="Evento o gira de origen (opcional)">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe el nombre o elige una opción"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {opciones.map((opcion) => {
          const activa = value.trim().toLowerCase() === opcion.toLowerCase();
          return (
            <button
              key={opcion}
              type="button"
              onClick={() => onChange(opcion)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activa
                  ? "bg-guinda text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {opcion}
            </button>
          );
        })}
      </div>
    </Field>
  );
}
