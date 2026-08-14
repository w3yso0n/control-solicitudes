"use client";

import { HOME_POR_ROL, ROL_LABEL } from "@/lib/catalogos";
import { NAV_ITEMS, puedeVer } from "@/lib/nav";
import { useSession } from "@/lib/session";
import type { Rol } from "@/lib/types";
import {
  ClipboardList,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  Settings,
  Shield,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/territorio": FolderOpen,
  "/cuantiva": Inbox,
  "/peticiones": ClipboardList,
  "/reportes": ClipboardList,
  "/configuracion": Settings,
  "/auditoria": Shield,
};

export function AppShell({ children }: { children: ReactNode }) {
  const { rol, ready, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!rol) {
      router.replace("/login");
      return;
    }
    if (!puedeVer(rol, pathname)) {
      router.replace(HOME_POR_ROL[rol]);
    }
  }, [ready, rol, pathname, router]);

  if (!ready || !rol) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        Cargando…
      </div>
    );
  }

  const items = NAV_ITEMS.filter((item) => item.roles.includes(rol));
  const esCandidata = rol === "candidata";

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-guinda text-white transition-all md:static ${
          collapsed ? "w-[72px]" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex h-16 items-center justify-center border-b border-white/10 px-3">
          {esCandidata ? (
            <Image
              src="/brand/logo-wordmark.png"
              alt="BE4TRIZ MOJICA"
              width={collapsed ? 48 : 140}
              height={collapsed ? 48 : 140}
              className={
                collapsed
                  ? "h-10 w-10 object-contain"
                  : "h-12 w-auto max-w-full object-contain"
              }
            />
          ) : collapsed ? (
            <span className="text-sm font-semibold tracking-widest">CS</span>
          ) : (
            <div className="w-full">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                Peticiones ciudadanas
              </p>
              <p className="text-sm font-semibold">Fase campaña</p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {items.map((item) => {
            const Icon = ICONS[item.href] ?? ClipboardList;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  active
                    ? "bg-white/15 ring-1 ring-magenta"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                <Icon size={18} />
                {collapsed ? null : <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          className="hidden items-center gap-2 border-t border-white/10 px-4 py-3 text-xs text-white/70 hover:bg-white/10 md:flex"
          onClick={() => setCollapsed((v) => !v)}
        >
          <PanelLeftClose size={16} />
          {collapsed ? null : "Colapsar"}
        </button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-2 text-guinda md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            {esCandidata ? (
              <div className="flex items-center gap-3">
                <Image
                  src="/brand/foto-perfil.png"
                  alt="Beatriz Mojica"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-guinda/20"
                />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Beatriz Mojica
                  </p>
                  <p className="text-xs text-zinc-500">{ROL_LABEL[rol]}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {ROL_LABEL[rol]}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-guinda"
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function requiereRol(rol: Rol | null, permitidos: Rol[]) {
  return rol != null && permitidos.includes(rol);
}
