import { requireCuantiva } from "@/lib/auth";
import { aceptarSolicitudPublica } from "@/lib/services/solicitudes-publicas";
import type { CapturarDocumentoInput } from "@/lib/services/peticiones";
import { NextRequest, NextResponse } from "next/server";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const firmantesRaw = body.firmantes;
  const firmantes =
    typeof firmantesRaw === "number"
      ? firmantesRaw
      : typeof firmantesRaw === "string" && firmantesRaw.trim()
        ? Number(firmantesRaw)
        : null;

  const input: CapturarDocumentoInput = {
    ciudadanoNombre: asString(body.ciudadanoNombre),
    ciudadanoDomicilio: asString(body.ciudadanoDomicilio),
    ciudadanoTelefono: asString(body.ciudadanoTelefono),
    remitenteRelacion: asString(body.remitenteRelacion) || "mismo",
    descripcion: asString(body.descripcion),
    transcripcion: asString(body.transcripcion),
    categoriaId: asString(body.categoriaId),
    subcategorias: Array.isArray(body.subcategorias)
      ? body.subcategorias.filter((s): s is string => typeof s === "string")
      : [],
    tipo: asString(body.tipo),
    urgencia: asString(body.urgencia),
    alcance: asString(body.alcance),
    complejidad: asString(body.complejidad),
    firmantes: firmantes != null && Number.isFinite(firmantes) ? firmantes : null,
    cveMun: asString(body.cveMun),
    lat: typeof body.lat === "number" ? body.lat : Number(body.lat),
    lng: typeof body.lng === "number" ? body.lng : Number(body.lng),
    metodoUbicacion: asString(body.metodoUbicacion),
    localidadInegi: asString(body.localidadInegi) || null,
    ubicacionLabel: asString(body.ubicacionLabel) || null,
    escenarioAcuse: asString(body.escenarioAcuse),
  };

  const result = await aceptarSolicitudPublica(authz.user.id, id, input);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
