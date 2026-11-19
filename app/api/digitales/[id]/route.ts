import { requireCuantiva } from "@/lib/auth";
import { actualizarDatosSolicitud } from "@/lib/services/solicitudes-publicas";
import { NextRequest, NextResponse } from "next/server";

function asString(value: unknown): string {
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value : "";
}

/** "Editar datos" del ciudadano. Queda registrado en Auditoría. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const result = await actualizarDatosSolicitud(authz.user.id, id, {
    nombre: asString(body.nombre),
    telefono: asString(body.telefono),
    cveMun: asString(body.cveMun),
    colonia: asString(body.colonia),
    nombreRegistra: asString(body.nombreRegistra),
    familiasBeneficiadas: asString(body.familiasBeneficiadas),
    descripcion: asString(body.descripcion),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.solicitud);
}
