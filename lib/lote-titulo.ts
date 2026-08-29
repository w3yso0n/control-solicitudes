import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import type { LoteDto } from "@/lib/types";

export function tituloLote(lote: Pick<LoteDto, "eventoOrigen" | "cveMun">) {
  const evento = lote.eventoOrigen.trim();
  if (evento && evento.toLowerCase() !== "no aplica") return evento;
  return (
    MUNICIPIOS_GUERRERO.find((m) => m.cveMun === lote.cveMun)?.nombre ??
    lote.cveMun
  );
}

export function nombreMunicipio(cveMun: string) {
  return MUNICIPIOS_GUERRERO.find((m) => m.cveMun === cveMun)?.nombre ?? cveMun;
}
