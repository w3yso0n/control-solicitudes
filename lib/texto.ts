/** Minúsculas y sin acentos, para comparar texto escrito a mano. */
export function normalizarBusqueda(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const PALABRAS_VACIAS = new Set([
  "para", "pero", "porque", "como", "donde", "desde", "hace", "hasta", "este",
  "esta", "estos", "estas", "que", "los", "las", "una", "uno", "unos", "unas",
  "del", "con", "por", "sin", "sobre", "entre", "muy", "mas", "ya", "hay",
  "tiene", "tienen", "nuestra", "nuestro", "nosotros", "solicito", "solicitamos",
  "favor", "apoyo", "calle", "colonia",
]);

/** Palabras significativas (4+ letras, sin palabras vacías). */
export function palabrasClave(texto: string): Set<string> {
  return new Set(
    normalizarBusqueda(texto)
      .replace(/[^a-z0-9ñ\s]/g, " ")
      .split(/\s+/)
      .filter((p) => p.length >= 4 && !PALABRAS_VACIAS.has(p)),
  );
}

/** Similitud de Jaccard entre dos conjuntos de palabras (0 a 1). */
export function similitud(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let comunes = 0;
  for (const p of a) if (b.has(p)) comunes += 1;
  return comunes / (a.size + b.size - comunes);
}
