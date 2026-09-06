export const PLANTILLAS_DEFAULT: Record<"A" | "B" | "C" | "D", string> = {
  A: "Hola {nombre}, recibimos tu petición con folio {folio} sobre {tema}. Gracias por confiar en Beatriz Mojica. Te mantendremos al tanto.",
  B: "Hola {nombre}, recibimos tu petición con folio {folio} sobre {tema}. También avisamos a {remitente}, quien nos la hizo llegar.",
  C: "Hola {remitente}, recibimos la petición de {nombre} con folio {folio} sobre {tema}. Gracias por ser el puente. Cuando haya novedades te escribimos.",
  D: "Sin canal de acuse: no hay teléfono para enviar confirmación. El folio {folio} queda registrado internamente.",
};
