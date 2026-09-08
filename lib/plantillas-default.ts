export type PlantillaId = "A" | "B" | "C" | "D";

export type DestinoPlantilla = "peticionario" | "remitente" | "ambos";

export type PlantillaAcuse = {
  texto: string;
  textoRemitente: string;
  destinatario: DestinoPlantilla;
};

export type PlantillasConfig = Record<PlantillaId, PlantillaAcuse>;

export const PLANTILLA_IDS: PlantillaId[] = ["A", "B", "C", "D"];

const TEXTO_PETICIONARIO =
  "Hola {nombre}, recibimos tu petición con folio {folio} sobre {tema}. Gracias por confiar en Beatriz Mojica. Te mantendremos al tanto.";

const TEXTO_REMITENTE =
  "Hola {remitente}, recibimos la petición de {nombre} con folio {folio} sobre {tema}. Gracias por ser el puente. Cuando haya novedades te escribimos.";

const TEXTO_B_PETICIONARIO =
  "Hola {nombre}, recibimos tu petición con folio {folio} sobre {tema}. También avisamos a {remitente}, quien nos la hizo llegar.";

export const DESTINATARIO_DEFAULT: Record<PlantillaId, DestinoPlantilla> = {
  A: "peticionario",
  B: "ambos",
  C: "remitente",
  D: "peticionario",
};

export const PLANTILLAS_DEFAULT: PlantillasConfig = {
  A: {
    texto: TEXTO_PETICIONARIO,
    textoRemitente: TEXTO_REMITENTE,
    destinatario: "peticionario",
  },
  B: {
    texto: TEXTO_B_PETICIONARIO,
    textoRemitente: TEXTO_REMITENTE,
    destinatario: "ambos",
  },
  C: {
    texto: TEXTO_REMITENTE,
    textoRemitente: TEXTO_REMITENTE,
    destinatario: "remitente",
  },
  D: {
    texto:
      "Sin canal de acuse: no hay teléfono para enviar confirmación. El folio {folio} queda registrado internamente.",
    textoRemitente: TEXTO_REMITENTE,
    destinatario: "peticionario",
  },
};

function esDestino(value: unknown): value is DestinoPlantilla {
  return value === "peticionario" || value === "remitente" || value === "ambos";
}

function textoOFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function normalizarPlantilla(
  id: PlantillaId,
  raw: unknown,
): PlantillaAcuse {
  const fallback = PLANTILLAS_DEFAULT[id];
  if (typeof raw === "string") {
    return {
      texto: raw.trim() || fallback.texto,
      textoRemitente: fallback.textoRemitente,
      destinatario: DESTINATARIO_DEFAULT[id],
    };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as {
      texto?: unknown;
      textoRemitente?: unknown;
      destinatario?: unknown;
    };
    return {
      texto: textoOFallback(obj.texto, fallback.texto),
      textoRemitente: textoOFallback(
        obj.textoRemitente,
        fallback.textoRemitente,
      ),
      destinatario: esDestino(obj.destinatario)
        ? obj.destinatario
        : DESTINATARIO_DEFAULT[id],
    };
  }
  return { ...fallback };
}

export function normalizarPlantillas(raw: unknown): PlantillasConfig {
  const src =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    A: normalizarPlantilla("A", src.A),
    B: normalizarPlantilla("B", src.B),
    C: normalizarPlantilla("C", src.C),
    D: normalizarPlantilla("D", src.D),
  };
}
