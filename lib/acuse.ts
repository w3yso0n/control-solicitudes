import type { EscenarioAcuse, RelacionRemitente } from "@/lib/types";

/** PDF §13.4: el escenario se deriva de quién envía y de qué teléfonos hay. */
export function derivarEscenarioAcuse(input: {
  relacion: RelacionRemitente;
  telefonoPeticionario: string | null | undefined;
  telefonoRemitente: string | null | undefined;
}): EscenarioAcuse {
  const tienePeticionario = Boolean(input.telefonoPeticionario?.trim());
  const tieneRemitente = Boolean(input.telefonoRemitente?.trim());
  if (input.relacion === "mismo") {
    return tienePeticionario ? "A" : "D";
  }
  if (tienePeticionario && tieneRemitente) return "B";
  if (!tienePeticionario && tieneRemitente) return "C";
  if (tienePeticionario) return "A";
  return "D";
}
