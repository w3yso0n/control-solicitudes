const ventanaMs = 10 * 60 * 1000;
const maxPorVentana = 8;
const hits = new Map<string, number[]>();

export function ipDeSolicitud(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const primero = forwarded?.split(",")[0]?.trim();
  return primero || headers.get("x-real-ip")?.trim() || "desconocida";
}

export function limitadoPorIp(ip: string): boolean {
  const ahora = Date.now();
  const previos = (hits.get(ip) ?? []).filter((t) => ahora - t < ventanaMs);
  if (previos.length >= maxPorVentana) {
    hits.set(ip, previos);
    return true;
  }
  previos.push(ahora);
  hits.set(ip, previos);
  return false;
}
