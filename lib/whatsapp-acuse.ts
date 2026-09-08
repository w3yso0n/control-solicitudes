import { CATEGORIA_POR_ID } from "@/lib/catalogos";
import type { DestinoPlantilla } from "@/lib/plantillas-default";
import type { EscenarioAcuse } from "@/lib/types";

export type PlantillaAcuseId = "A" | "B" | "C";

export type DestinatarioWa = {
  id: "peticionario" | "remitente";
  label: string;
  telefono: string;
};

export type PeticionWhatsApp = {
  folio: string;
  escenarioAcuse: EscenarioAcuse;
  ciudadanoNombre: string;
  ciudadanoTelefono: string | null;
  remitenteNombre: string | null;
  remitenteTelefono: string | null;
  categoriaId: string;
  subcategorias: string[];
};

export function digitosTelefono(
  value: string | null | undefined,
): string | null {
  const raw = (value ?? "").replace(/\D/g, "");
  if (!raw || raw === "0000000000") return null;
  return raw;
}

export function waMeNumero(digitos: string): string {
  if (digitos.length === 10) return `52${digitos}`;
  if (digitos.startsWith("521") && digitos.length === 13) {
    return `52${digitos.slice(3)}`;
  }
  if (digitos.startsWith("52") && digitos.length >= 12) return digitos;
  return digitos;
}

export function aplicarPlantilla(
  texto: string,
  vars: { nombre: string; folio: string; tema: string; remitente: string },
): string {
  return texto.replace(/\{(nombre|folio|tema|remitente)\}/g, (_, clave) => {
    if (clave === "nombre") return vars.nombre;
    if (clave === "folio") return vars.folio;
    if (clave === "tema") return vars.tema;
    if (clave === "remitente") return vars.remitente;
    return "";
  });
}

export function temaPeticion(
  categoriaId: string,
  subcategorias: string[],
): string {
  const cat = CATEGORIA_POR_ID[categoriaId]?.nombre ?? categoriaId;
  const sub = subcategorias[0]?.trim();
  return sub ? `${cat} · ${sub}` : cat;
}

export function varsPlantilla(p: PeticionWhatsApp) {
  return {
    nombre: p.ciudadanoNombre.trim(),
    folio: p.folio,
    tema: temaPeticion(p.categoriaId, p.subcategorias),
    remitente: p.remitenteNombre?.trim() || "el intermediario",
  };
}

export function destinatariosSegunEscenario(
  p: PeticionWhatsApp,
): DestinatarioWa[] {
  const pet = digitosTelefono(p.ciudadanoTelefono);
  const rem = digitosTelefono(p.remitenteTelefono);
  if (p.escenarioAcuse === "D") return [];
  if (p.escenarioAcuse === "A") {
    return pet
      ? [
          {
            id: "peticionario",
            label: p.ciudadanoNombre,
            telefono: pet,
          },
        ]
      : [];
  }
  if (p.escenarioAcuse === "C") {
    return rem
      ? [
          {
            id: "remitente",
            label: p.remitenteNombre?.trim() || "Remitente",
            telefono: rem,
          },
        ]
      : [];
  }
  const out: DestinatarioWa[] = [];
  if (pet) {
    out.push({
      id: "peticionario",
      label: `Peticionario · ${p.ciudadanoNombre}`,
      telefono: pet,
    });
  }
  if (rem) {
    out.push({
      id: "remitente",
      label: `Remitente · ${p.remitenteNombre?.trim() || "Intermediario"}`,
      telefono: rem,
    });
  }
  return out;
}

export function plantillaPorDefecto(
  escenario: EscenarioAcuse,
): PlantillaAcuseId {
  if (escenario === "C") return "C";
  if (escenario === "B") return "B";
  return "A";
}

export function plantillasPermitidasPorEscenario(
  escenario: EscenarioAcuse,
): PlantillaAcuseId[] {
  if (escenario === "A") return ["A"];
  if (escenario === "B") return ["A", "B"];
  if (escenario === "C") return ["C"];
  return [];
}

export function destinosParaPlantilla(
  destinos: DestinatarioWa[],
  destinoPlantilla: DestinoPlantilla,
): DestinatarioWa[] {
  if (destinoPlantilla === "ambos") return destinos;
  const preferido = destinos.find((d) => d.id === destinoPlantilla);
  if (preferido) return [preferido];
  return destinos[0] ? [destinos[0]] : [];
}

export function textoParaDestino(
  plantilla: {
    texto: string;
    textoRemitente: string;
    destinatario: DestinoPlantilla;
  },
  destinoId: DestinatarioWa["id"],
): string {
  if (plantilla.destinatario === "ambos" && destinoId === "remitente") {
    return plantilla.textoRemitente;
  }
  return plantilla.texto;
}

export function urlWaMe(telefono: string, mensaje: string): string {
  return `https://wa.me/${waMeNumero(telefono)}?text=${encodeURIComponent(mensaje)}`;
}

export function telefonoVisibleConsulta(p: PeticionWhatsApp): string {
  if (p.escenarioAcuse === "C") {
    return digitosTelefono(p.remitenteTelefono) ?? "Sin teléfono";
  }
  return digitosTelefono(p.ciudadanoTelefono) ?? "Sin teléfono";
}

export function puedeAbrirWhatsApp(p: PeticionWhatsApp): boolean {
  return destinatariosSegunEscenario(p).length > 0;
}
