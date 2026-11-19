import { requireCuantiva } from "@/lib/auth";
import { contarSolicitudes } from "@/lib/services/solicitudes-publicas";
import { NextResponse } from "next/server";

export async function GET() {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  const conteo = await contarSolicitudes();
  return NextResponse.json(conteo);
}
