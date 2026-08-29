import type { Rol } from "./types";

export type NavItem = {
  href: string;
  label: string;
  roles: Rol[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["candidata", "admin"] },
  { href: "/territorio", label: "Captura de lotes", roles: ["territorio", "admin"] },
  { href: "/bandeja", label: "Bandeja", roles: ["cuantiva", "admin"] },
  {
    href: "/peticiones",
    label: "Consulta",
    roles: ["cuantiva", "candidata", "admin"],
  },
  { href: "/reportes", label: "Reportes", roles: ["candidata", "admin"] },
  { href: "/configuracion", label: "Configuración", roles: ["admin"] },
  { href: "/auditoria", label: "Auditoría", roles: ["admin"] },
];

export function puedeVer(rol: Rol, href: string): boolean {
  const item = NAV_ITEMS.find((n) => href === n.href || href.startsWith(`${n.href}/`));
  if (!item) {
    if (href.startsWith("/territorio")) return rol === "territorio" || rol === "admin";
    if (href.startsWith("/bandeja")) return rol === "cuantiva" || rol === "admin";
    if (href.startsWith("/usuarios")) return rol === "admin";
    return false;
  }
  return item.roles.includes(rol);
}
