import { requireCuantiva } from "@/lib/auth";
import { buscarCoincidenciasIdentidad } from "@/lib/services/peticiones";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authz = await requireCuantiva();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const { searchParams } = request.nextUrl;
    const result = await buscarCoincidenciasIdentidad({
      nombre: searchParams.get("nombre") ?? "",
      domicilio: searchParams.get("domicilio") ?? "",
      telefono: searchParams.get("telefono") ?? undefined,
      fechaEntrega: searchParams.get("fechaEntrega") ?? undefined,
      categoriaId: searchParams.get("categoriaId") ?? undefined,
      excluirId: searchParams.get("excluirId") ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] GET /api/cuantiva/identidad:", error);
    return NextResponse.json(
      { error: "No se pudo consultar la identidad" },
      { status: 500 },
    );
  }
}
