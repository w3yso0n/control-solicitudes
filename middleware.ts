import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { puedeVer } from "@/lib/nav";
import type { Rol } from "@/lib/types";

const { auth } = NextAuth(authConfig);

const HOME_POR_ROL: Record<Rol, string> = {
  territorio: "/territorio",
  cuantiva: "/bandeja",
  operador: "/cumplimientos",
  candidata: "/dashboard",
  admin: "/dashboard",
};

const ROLES: Rol[] = ["territorio", "cuantiva", "operador", "candidata", "admin"];

function rolDeSesion(value: unknown): Rol | null {
  if (typeof value === "string" && ROLES.includes(value as Rol)) {
    return value as Rol;
  }
  return null;
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/aviso-privacidad") ||
    pathname === "/solicitar" ||
    pathname.startsWith("/solicitar/");

  if (
    request.method === "POST" &&
    pathname.startsWith("/api/publico")
  ) {
    const origin = request.headers.get("origin");
    const host = (
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      ""
    )
      .split(",")[0]
      .trim();
    let originHost = "";
    try {
      originHost = origin ? new URL(origin).host : "";
    } catch {
      originHost = "";
    }
    if (!originHost || !host || originHost !== host) {
      return NextResponse.json(
        { error: "Origen no permitido" },
        { status: 403 },
      );
    }
  }

  if (isApiRoute) {
    return NextResponse.next();
  }

  if (!request.auth && !isPublicPage) {
    const urlRedirect = request.nextUrl.clone();
    urlRedirect.pathname = "/login";
    return NextResponse.redirect(urlRedirect);
  }

  if (request.auth && pathname.startsWith("/login")) {
    const urlRedirect = request.nextUrl.clone();
    urlRedirect.pathname = "/";
    return NextResponse.redirect(urlRedirect);
  }

  if (request.auth && !isPublicPage && pathname !== "/") {
    const rol = rolDeSesion(request.auth.user?.role);
    if (!rol || !puedeVer(rol, pathname)) {
      const urlRedirect = request.nextUrl.clone();
      urlRedirect.pathname = rol ? HOME_POR_ROL[rol] : "/login";
      return NextResponse.redirect(urlRedirect);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|scans|geo).*)"],
};
