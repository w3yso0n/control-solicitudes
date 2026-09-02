import type { Rol } from "./types";

export type NavGrupoId = "vision" | "operacion" | "consulta" | "admin";

export type NavItem = {
  href: string;
  label: string;
  roles: Rol[];
  grupo: NavGrupoId;
};

export const NAV_GRUPOS: { id: NavGrupoId; label: string }[] = [
  { id: "vision", label: "Visión" },
  { id: "operacion", label: "Operación" },
  { id: "consulta", label: "Consulta" },
  { id: "admin", label: "Administración" },
];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["candidata", "admin"], grupo: "vision" },
  // { href: "/reportes", label: "Reportes", roles: ["candidata", "admin"], grupo: "vision" },
  { href: "/territorio", label: "Captura de lotes", roles: ["territorio", "admin"], grupo: "operacion" },
  { href: "/bandeja", label: "Bandeja", roles: ["cuantiva", "admin"], grupo: "operacion" },
  {
    href: "/peticiones",
    label: "Consulta",
    roles: ["cuantiva", "candidata", "admin"],
    grupo: "consulta",
  },
  { href: "/usuarios", label: "Usuarios", roles: ["admin"], grupo: "admin" },
  { href: "/configuracion", label: "Configuración", roles: ["admin"], grupo: "admin" },
  { href: "/auditoria", label: "Auditoría", roles: ["admin"], grupo: "admin" },
];

export function navPorGrupos(rol: Rol) {
  return NAV_GRUPOS.map((grupo) => ({
    ...grupo,
    items: NAV_ITEMS.filter((item) => item.grupo === grupo.id && item.roles.includes(rol)),
  })).filter((grupo) => grupo.items.length > 0);
}

export function puedeVer(rol: Rol, href: string): boolean {
  const item = NAV_ITEMS.find((n) => href === n.href || href.startsWith(`${n.href}/`));
  if (!item) {
    if (href.startsWith("/territorio")) return rol === "territorio" || rol === "admin";
    if (href.startsWith("/bandeja")) return rol === "cuantiva" || rol === "admin";
    if (href.startsWith("/usuarios")) return rol === "admin";
    // Ruta oculta del menú; descomentar el item de NAV_ITEMS para volver a mostrarla.
    if (href.startsWith("/reportes")) return rol === "candidata" || rol === "admin";
    return false;
  }
  return item.roles.includes(rol);
}
