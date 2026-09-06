import { requireOperador } from "@/lib/auth";
import {
  marcarCumplida,
  marcarNoProcede,
  moverAEnGestion,
  reclasificarComplejidad,
} from "@/lib/services/cumplimientos";
import type { Complejidad } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requireOperador();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const id = (await params).id;
    const body = (await request.json()) as Record<string, unknown>;
    const accion = typeof body.accion === "string" ? body.accion : "";

    let result:
      | { error: string; status: 400 | 404 }
      | { peticion: unknown };

    if (accion === "en_gestion") {
      result = await moverAEnGestion(authz.user.id, id);
    } else if (accion === "no_procede") {
      result = await marcarNoProcede(
        authz.user.id,
        id,
        typeof body.motivo === "string" ? body.motivo : "",
      );
    } else if (accion === "cumplida") {
      result = await marcarCumplida(authz.user.id, id, {
        fechaCumplimiento:
          typeof body.fechaCumplimiento === "string"
            ? body.fechaCumplimiento
            : "",
        descripcionCumplimiento:
          typeof body.descripcionCumplimiento === "string"
            ? body.descripcionCumplimiento
            : "",
      });
    } else if (accion === "reclasificar") {
      result = await reclasificarComplejidad(
        authz.user.id,
        id,
        (typeof body.complejidad === "string"
          ? body.complejidad
          : "") as Complejidad,
      );
    } else {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, peticion: result.peticion });
  } catch (error) {
    console.error("[API] POST /api/cumplimientos/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar el cumplimiento" },
      { status: 500 },
    );
  }
}
