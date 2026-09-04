import { createHash } from "node:crypto";

export function normalizarIdentidad(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function hashIdentidad(nombre: string, domicilio: string): string {
  const clave = `${normalizarIdentidad(nombre)}|${normalizarIdentidad(domicilio)}`;
  return createHash("sha256").update(clave).digest("hex");
}
