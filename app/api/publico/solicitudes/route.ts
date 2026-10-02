import { limitadoPorIp, ipDeSolicitud } from "@/lib/publico-limite";
import { crearSolicitudPublica } from "@/lib/services/solicitudes-publicas";
import { savePublicFoto, removeSavedUploads } from "@/lib/uploads";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const ip = ipDeSolicitud(request.headers);
  if (limitadoPorIp(ip)) {
    return NextResponse.json(
      { error: "Espera un momento antes de enviar otra solicitud" },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario" }, { status: 400 });
  }

  const trampa = String(form.get("empresa") ?? "").trim();
  if (trampa) {
    return NextResponse.json({ recibido: true });
  }

  if (String(form.get("aviso") ?? "") !== "1") {
    return NextResponse.json(
      { error: "Acepta el aviso de privacidad para continuar" },
      { status: 400 },
    );
  }

  const foto = form.get("foto");
  let guardada: Awaited<ReturnType<typeof savePublicFoto>> | null = null;
  if (foto instanceof File && foto.size > 0) {
    guardada = await savePublicFoto(foto);
    if ("error" in guardada) {
      return NextResponse.json({ error: guardada.error }, { status: 400 });
    }
  }

  let result: Awaited<ReturnType<typeof crearSolicitudPublica>>;
  try {
    result = await crearSolicitudPublica({
      esGrupo: String(form.get("esGrupo") ?? "") === "1",
      nombre: String(form.get("nombre") ?? ""),
      telefono: String(form.get("telefono") ?? ""),
      cveMun: String(form.get("cveMun") ?? ""),
      descripcion: String(form.get("descripcion") ?? ""),
      foto: guardada
        ? {
            storageKey: guardada.storageKey,
            nombre: guardada.nombreArchivo,
            mime: guardada.mimeType,
          }
        : null,
    });
  } catch {
    if (guardada && !("error" in guardada)) {
      await removeSavedUploads([guardada]);
    }
    return NextResponse.json(
      { error: "No se pudo guardar la solicitud" },
      { status: 500 },
    );
  }

  if ("error" in result) {
    if (guardada && !("error" in guardada)) {
      await removeSavedUploads([guardada]);
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ recibido: true });
}
