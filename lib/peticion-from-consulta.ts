import type { Peticion, PeticionConsultaDto } from "@/lib/types";

export function peticionDesdeConsulta(dto: PeticionConsultaDto): Peticion {
  return {
    id: dto.id,
    folio: dto.folio,
    ciudadano: {
      id: dto.id,
      nombre: dto.ciudadanoNombre,
      telefono: dto.ciudadanoTelefono ?? "",
      coloniaId: dto.coloniaId ?? undefined,
      cveMun: dto.cveMun,
      domicilio: dto.ciudadanoDomicilio || undefined,
    },
    descripcion: dto.descripcion,
    transcripcion: dto.transcripcion,
    categoriaId: dto.categoriaId,
    subcategorias: dto.subcategorias,
    tipo: dto.tipo,
    urgencia: dto.urgencia,
    alcance: dto.alcance,
    complejidad: dto.complejidad,
    comunitaria: dto.alcance === "colectivo",
    firmantes: dto.firmantes ?? undefined,
    cveMun: dto.cveMun,
    coloniaId: dto.coloniaId ?? undefined,
    fechaEntrega: dto.fechaEntrega,
    fechaCaptura: dto.fechaCaptura,
    estatus: dto.estatus,
    documentoUrl: dto.documento.url,
  };
}
