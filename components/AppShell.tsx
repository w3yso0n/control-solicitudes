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

function LogoMarca({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Image
        src="/brand/foto-perfil.png"
        alt="Beatriz Mojica"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white/25"
      />
    );
  }
  return (
    <div className="relative aspect-square w-full max-w-[156px]">
      <Image
        src="/brand/logo-wordmark.png"
        alt="Beatriz Mojica"
        fill
        className="object-contain"
      />
    </div>
  );
}

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
    <div className="min-h-screen bg-hueso">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-tinta/50 md:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Sidebar: fijo respecto al viewport, no viaja con el scroll de la página. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden rounded-r-[1.75rem] bg-gradient-to-b from-guinda to-[#4d0c22] text-white shadow-[12px_0_36px_-20px_rgba(28,10,18,0.55)] transition-[width] duration-200 ${
          collapsed ? "w-[72px]" : "w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div
          className={`flex h-40 shrink-0 items-center justify-center border-b border-white/10 ${collapsed ? "px-2" : "px-4 py-3"}`}
        >
          <LogoMarca compact={collapsed} />
        </div>
        {esCandidata && !collapsed ? (
          <div className="mx-4 mt-4 flex shrink-0 items-center gap-3 rounded-2xl bg-white/10 px-3.5 py-3">
            <Image
              src="/brand/foto-perfil.png"
              alt="Beatriz Mojica"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-white/25"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                Beatriz Mojica
              </p>
              <p className="text-xs text-white/60">Fase campaña</p>
            </div>
          </div>
        ) : null}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {items.map((item) => {
            const Icon = ICONS[item.href] ?? ClipboardList;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3.5 text-[15px] font-medium transition-colors ${
                  active
                    ? "bg-white text-guinda shadow-[0_8px_20px_-10px_rgba(0,0,0,0.5)]"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={20} />
                {collapsed ? null : <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Pie fijo del sidebar: colapsar y cerrar sesión siempre visibles, no hacen scroll con el nav. */}
        <div className="shrink-0 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className={`flex w-full items-center gap-3 px-3 py-3 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut size={18} />
            {collapsed ? null : <span>Cerrar sesión</span>}
          </button>
          <button
            type="button"
            className={`hidden w-full items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-white/50 hover:text-white md:flex ${collapsed ? "justify-center px-3" : ""}`}
            onClick={() => setCollapsed((v) => !v)}
          >
            <PanelLeftClose size={16} />
            {collapsed ? null : "Minimizar"}
          </button>
        </div>
      </aside>

      {/* Columna de contenido: el margen izquierdo reserva el espacio fijo del sidebar. */}
      <div
        className={`flex min-h-screen flex-col transition-[margin] duration-200 ${collapsed ? "md:ml-[72px]" : "md:ml-72"}`}
      >
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 shadow-[0_1px_0_rgba(28,10,18,0.04)] md:px-6">
          <button
            type="button"
            className="rounded-full p-2 text-guinda md:hidden"
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
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function requiereRol(rol: Rol | null, permitidos: Rol[]) {
  return rol != null && permitidos.includes(rol);
}
