"use client";

import { FilterCombobox, type FilterOption } from "@/components/FilterCombobox";
import { Field, Input } from "@/components/ui";
import { esOpcionEspecificar } from "@/lib/catalogos";

export function CampoConEspecificar({
  label,
  especificarLabel = "Especificar",
  especificarPlaceholder = "Escribe la opción…",
  value,
  extra,
  onChange,
  options,
  placeholder,
  emptyLabel,
  searchPlaceholder,
}: {
  label: string;
  especificarLabel?: string;
  especificarPlaceholder?: string;
  value: string;
  extra: string;
  onChange: (value: string, extra: string) => void;
  options: FilterOption[];
  placeholder: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
}) {
  const etiqueta =
    options.find((o) => o.id === value)?.label ?? value;
  const mostrar = Boolean(value) && esOpcionEspecificar(etiqueta);

  return (
    <div className="space-y-3">
      <Field label={label}>
        <FilterCombobox
          value={value}
          onChange={(id) => {
            const sigue = esOpcionEspecificar(
              options.find((o) => o.id === id)?.label ?? id,
            );
            onChange(id, sigue ? extra : "");
          }}
          options={options}
          placeholder={placeholder}
          emptyLabel={emptyLabel}
          searchPlaceholder={searchPlaceholder}
        />
      </Field>
      {mostrar ? (
        <div className="transition-opacity duration-150 ease-out">
          <Field label={especificarLabel}>
            <Input
              value={extra}
              onChange={(e) => onChange(value, e.target.value)}
              placeholder={especificarPlaceholder}
              autoComplete="off"
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
