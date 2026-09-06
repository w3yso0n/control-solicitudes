import { requireCuantiva } from "@/lib/auth";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { NextRequest, NextResponse } from "next/server";

const CVE_OK = new Set(MUNICIPIOS_GUERRERO.map((m) => m.cveMun));

export type LocalidadInegi = {
  cveLoc: string;
  nombre: string;
  ambito: string;
  lat: number;
  lng: number;
  poblacion: number | null;
};

export async function GET(request: NextRequest) {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const cveMun = request.nextUrl.searchParams.get("cveMun")?.trim() ?? "";
  if (!CVE_OK.has(cveMun)) {
    return NextResponse.json({ error: "Municipio inválido" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://gaia.inegi.org.mx/wscatgeo/v2/localidades/12/${cveMun}`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: "No se pudieron cargar las localidades INEGI" },
        { status: 502 },
      );
    }
    const json = (await res.json()) as {
      datos?: {
        cve_loc?: string;
        nomgeo?: string;
        ambito?: string;
        latitud?: string;
        longitud?: string;
        pob_total?: string;
      }[];
    };
    const localidades: LocalidadInegi[] = (json.datos ?? [])
      .map((d) => ({
        cveLoc: String(d.cve_loc ?? "").padStart(4, "0"),
        nombre: (d.nomgeo ?? "").trim(),
        ambito: (d.ambito ?? "").trim(),
        lat: Number(d.latitud),
        lng: Number(d.longitud),
        poblacion: d.pob_total ? Number(d.pob_total) : null,
      }))
      .filter(
        (d) =>
          d.cveLoc &&
          d.nombre &&
          Number.isFinite(d.lat) &&
          Number.isFinite(d.lng),
      )
      .sort((a, b) => (b.poblacion ?? 0) - (a.poblacion ?? 0));

    return NextResponse.json(localidades);
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar las localidades INEGI" },
      { status: 502 },
    );
  }
}
