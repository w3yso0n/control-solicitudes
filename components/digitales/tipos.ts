import type {
  ConteoSolicitudes,
  ParecidaDto,
  SolicitudPublicaDto,
} from "@/lib/services/solicitudes-publicas";

export type Solicitud = SolicitudPublicaDto;
export type Parecida = ParecidaDto;
export type Conteo = ConteoSolicitudes;
export type EstatusLista = "pendiente" | "aceptada" | "descartada";

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const TZ = "America/Mexico_City";

/** Teléfono completo con espacios: "744 123 4567". */
export function telefonoVisible(tel: string | null) {
  if (!tel) return null;
  if (tel.length !== 10) return tel;
  return `${tel.slice(0, 3)} ${tel.slice(3, 6)} ${tel.slice(6)}`;
}

export function iniciales(nombre: string) {
  const partes = nombre
    .replace(/[^\p{L}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0] ?? "";
  const segunda = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primera + segunda).toUpperCase();
}

function diaMexico(fecha: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

/** "hace 2 h" (menos de 24 h), "ayer", "hace 3 días". */
export function antiguedad(iso: string, ahora = Date.now()) {
  const fecha = new Date(iso);
  const diff = Math.max(0, ahora - fecha.getTime());
  if (diff < DIA) {
    const min = Math.floor(diff / 60000);
    if (min < 1) return { texto: "ahora", vieja: false };
    if (min < 60) return { texto: `hace ${min} min`, vieja: false };
    return { texto: `hace ${Math.floor(diff / HORA)} h`, vieja: false };
  }
  const ayer = diaMexico(new Date(ahora - DIA));
  if (diaMexico(fecha) === ayer) return { texto: "ayer", vieja: true };
  const dias = Math.max(2, Math.round(diff / DIA));
  return { texto: `hace ${dias} días`, vieja: true };
}

/** "Recibida hoy, 10:42" / "Recibida ayer, 18:05" / "Recibida 12 nov, 09:30". */
export function recibida(iso: string, ahora = Date.now()) {
  const fecha = new Date(iso);
  const hora = new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
  const dia = diaMexico(fecha);
  if (dia === diaMexico(new Date(ahora))) return `Recibida hoy, ${hora}`;
  if (dia === diaMexico(new Date(ahora - DIA))) return `Recibida ayer, ${hora}`;
  const corta = new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  })
    .format(fecha)
    .replace(".", "");
  return `Recibida ${corta}, ${hora}`;
}

export function tipoTexto(s: Solicitud) {
  if (!s.esGrupo) return "Persona";
  return s.familiasBeneficiadas
    ? `Comunitaria · ≈ ${s.familiasBeneficiadas} familias`
    : "Comunitaria";
}

export function ubicacionTexto(s: Pick<Solicitud, "municipio" | "colonia">) {
  return [s.municipio, s.colonia].filter(Boolean).join(" · ");
}

/** Avisa al sidebar (AppShell) que el conteo de "Por revisar" cambió. */
export function avisarConteo() {
  window.dispatchEvent(new Event("digitales:conteo"));
}
