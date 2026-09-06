import { getCurrentUser, puedeCapturar, requireAdmin } from "@/lib/auth";
import { categoriasConExtras } from "@/lib/catalogos";
import {
  getConfigCompleta,
  getMunicipiosFoco,
  getSubsExtra,
  guardarMunicipiosFoco,
  guardarPlantillas,
  guardarSubsExtra,
} from "@/lib/services/config";
import type { PlantillasConfig } from "@/lib/services/config";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (user.role === "admin") {
      const config = await getConfigCompleta();
      return NextResponse.json({
        ...config,
        categorias: categoriasConExtras(config.subsExtra),
      });
    }

    if (puedeCapturar(user.role)) {
      const extras = await getSubsExtra();
      return NextResponse.json({
        subsExtra: extras,
        categorias: categoriasConExtras(extras),
      });
    }

    if (user.role === "candidata") {
      const municipiosFoco = await getMunicipiosFoco();
      return NextResponse.json({ municipiosFoco });
    }

    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  } catch (error) {
    console.error("[API] GET /api/config:", error);
    return NextResponse.json(
      { error: "Error al obtener la configuración" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authz = await requireAdmin();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const seccion = typeof body.seccion === "string" ? body.seccion : "";

    if (seccion === "plantillas") {
      const raw = body.plantillas as Partial<PlantillasConfig> | undefined;
      if (!raw) {
        return NextResponse.json({ error: "Plantillas inválidas" }, { status: 400 });
      }
      await guardarPlantillas(authz.user, {
        A: String(raw.A ?? ""),
        B: String(raw.B ?? ""),
        C: String(raw.C ?? ""),
        D: String(raw.D ?? ""),
      });
    } else if (seccion === "geografia") {
      const claves = Array.isArray(body.municipiosFoco)
        ? body.municipiosFoco.filter((c): c is string => typeof c === "string")
        : [];
      await guardarMunicipiosFoco(authz.user, claves);
    } else if (seccion === "catalogo") {
      const extras =
        body.subsExtra && typeof body.subsExtra === "object"
          ? (body.subsExtra as Record<string, unknown>)
          : {};
      const limpio: Record<string, string[]> = {};
      for (const [id, lista] of Object.entries(extras)) {
        if (!Array.isArray(lista)) continue;
        limpio[id] = lista.filter((s): s is string => typeof s === "string");
      }
      await guardarSubsExtra(authz.user, limpio);
    } else {
      return NextResponse.json({ error: "Sección no válida" }, { status: 400 });
    }

    const config = await getConfigCompleta();
    return NextResponse.json({
      success: true,
      ...config,
      categorias: categoriasConExtras(config.subsExtra),
    });
  } catch (error) {
    console.error("[API] PUT /api/config:", error);
    return NextResponse.json(
      { error: "Error al guardar la configuración" },
      { status: 500 },
    );
  }
}
