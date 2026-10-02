import { requireCuantiva } from "@/lib/auth";
import { MOTIVOS_DESCARTE_PUBLICO } from "@/lib/catalogos";
import {
  descartarSolicitudes,
  listarSolicitudesPublicas,
} from "@/lib/services/solicitudes-publicas";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  const estatus = request.nextUrl.searchParams.get("estatus") ?? "pendiente";
  const filtro =
    estatus === "aceptada" || estatus === "descartada" || estatus === "pendiente"
      ? estatus
      : "pendiente";
  const rows = await listarSolicitudesPublicas(filtro);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  const body = (await request.json()) as { ids?: unknown; motivo?: unknown };
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : [];
  const motivo =
    typeof body.motivo === "string" && body.motivo
      ? body.motivo
      : MOTIVOS_DESCARTE_PUBLICO[0].id;
  const result = await descartarSolicitudes(authz.user.id, ids, motivo);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
