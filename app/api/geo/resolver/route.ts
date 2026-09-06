import { requireCuantiva } from "@/lib/auth";
import { resolverUbicacion } from "@/lib/geo-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const body = (await request.json()) as { lat?: unknown; lng?: unknown };
  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lng = typeof body.lng === "number" ? body.lng : Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }
  if (lat < 14 || lat > 20 || lng > -97 || lng < -104) {
    return NextResponse.json(
      { error: "El punto queda fuera de Guerrero" },
      { status: 400 },
    );
  }

  const resuelto = await resolverUbicacion(lat, lng);
  if (!resuelto.cveMun) {
    return NextResponse.json(
      { error: "Ese punto no cae en un municipio de Guerrero" },
      { status: 400 },
    );
  }
  return NextResponse.json(resuelto);
}
