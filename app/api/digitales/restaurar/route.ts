import { requireCuantiva } from "@/lib/auth";
import { restaurarSolicitudes } from "@/lib/services/solicitudes-publicas";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  const body = (await request.json()) as { ids?: unknown };
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : [];
  const result = await restaurarSolicitudes(authz.user.id, ids);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
