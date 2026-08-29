import { requireConsulta } from "@/lib/auth";
import { getPeticionConsultaById } from "@/lib/services/peticiones";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requireConsulta();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const id = (await params).id;
    const peticion = await getPeticionConsultaById(id);
    if (!peticion) {
      return NextResponse.json(
        { error: "Petición no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(peticion);
  } catch (error) {
    console.error("[API] GET /api/peticiones/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener la petición" },
      { status: 500 },
    );
  }
}
