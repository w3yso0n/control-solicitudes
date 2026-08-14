import { Card } from "@/components/ui";
import {
  ALCANCES,
  CATEGORIA_POR_ID,
  COLONIA_POR_ID,
  MUNICIPIO_POR_CVE,
  TIPOS_PETICION,
  URGENCIAS,
} from "@/lib/catalogos";
import type { Evento, Peticion } from "@/lib/types";
import { X } from "lucide-react";

function etiqueta<T extends string>(
  lista: readonly { id: T; nombre: string }[],
  id: T,
) {
  return lista.find((x) => x.id === id)?.nombre ?? id;
}

function fechaCorta(iso: string) {
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-800">{value}</p>
    </div>
  );
}

export function DetallePeticion({
  peticion,
  evento,
  onCerrar,
}: {
  peticion: Peticion;
  evento?: Evento;
  onCerrar: () => void;
}) {
  return (
    <Card className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-400">Folio</p>
          <p className="font-mono text-sm font-semibold text-guinda">
            {peticion.folio}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Cerrar detalle"
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={peticion.documentoUrl}
            alt={`Documento ${peticion.folio}`}
            className="mx-auto max-h-64 w-full object-contain"
          />
        </div>
        <div className="space-y-4 p-4">
          <p className="text-sm leading-6 text-zinc-700">{peticion.descripcion}</p>
          <div className="flex flex-wrap gap-2">
            {peticion.comunitaria ? (
              <span className="rounded-full bg-magenta/10 px-2 py-0.5 text-[10px] font-medium text-magenta">
                Denuncia comunitaria
              </span>
            ) : null}
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] capitalize text-zinc-600">
              {peticion.estatus}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Dato label="Ciudadano" value={peticion.ciudadano.nombre} />
            <Dato label="Teléfono" value={peticion.ciudadano.telefono} />
            <Dato
              label="Municipio"
              value={MUNICIPIO_POR_CVE[peticion.cveMun]?.nombre ?? peticion.cveMun}
            />
            <Dato
              label="Colonia"
              value={
                peticion.coloniaId
                  ? COLONIA_POR_ID[peticion.coloniaId]?.nombre ?? peticion.coloniaId
                  : peticion.ciudadano.domicilio ?? "—"
              }
            />
            <Dato
              label="Categoría"
              value={CATEGORIA_POR_ID[peticion.categoriaId]?.nombre ?? peticion.categoriaId}
            />
            <Dato
              label="Subcategoría"
              value={peticion.subcategorias.join(", ") || "—"}
            />
            <Dato label="Tipo" value={etiqueta(TIPOS_PETICION, peticion.tipo)} />
            <Dato label="Urgencia" value={etiqueta(URGENCIAS, peticion.urgencia)} />
            <Dato label="Alcance" value={etiqueta(ALCANCES, peticion.alcance)} />
            <Dato
              label="Firmantes"
              value={
                peticion.alcance === "colectivo"
                  ? String(peticion.firmantes ?? 1)
                  : "—"
              }
            />
            <Dato label="Entrega" value={fechaCorta(peticion.fechaEntrega)} />
            <Dato label="Captura" value={fechaCorta(peticion.fechaCaptura)} />
            <Dato
              label="Evento"
              value={evento ? `${evento.nombre} · ${evento.lugar}` : "—"}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
