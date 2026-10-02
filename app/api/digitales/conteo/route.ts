import { requireCuantiva } from "@/lib/auth";
import { contarSolicitudesPendientes } from "@/lib/services/solicitudes-publicas";
import { NextResponse } from "next/server";

export async function GET() {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  const pendientes = await contarSolicitudesPendientes();
  return NextResponse.json({ pendientes });
}
