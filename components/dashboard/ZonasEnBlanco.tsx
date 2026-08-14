import { Card } from "@/components/ui";
import {
  MUNICIPIOS_GUERRERO,
  ORDEN_REGIONES,
  type MunicipioGeo,
  type RegionGuerrero,
} from "@/lib/geografia-guerrero";

type RegionResumen = {
  region: RegionGuerrero;
  total: number;
  activas: number;
  blancas: MunicipioGeo[];
};

export function ZonasEnBlanco({ cvesActivos }: { cvesActivos: Set<string> }) {
  const regiones: RegionResumen[] = ORDEN_REGIONES.map((region) => {
    const munis = MUNICIPIOS_GUERRERO.filter((m) => m.region === region);
    const blancas = munis.filter((m) => !cvesActivos.has(m.cveMun));
    return {
      region,
      total: munis.length,
      activas: munis.length - blancas.length,
      blancas,
    };
  });

  const total = MUNICIPIOS_GUERRERO.length;
  const conPeticion = MUNICIPIOS_GUERRERO.filter((m) =>
    cvesActivos.has(m.cveMun),
  ).length;
  const cobertura = Math.round((conPeticion / total) * 100);
  const enBlanco = total - conPeticion;

  const sinPresencia = regiones.filter((r) => r.activas === 0);
  const huecosJuntoActiva = regiones
    .filter((r) => r.activas > 0 && r.blancas.length > 0)
    .flatMap((r) => r.blancas.map((m) => ({ ...m, region: r.region })));

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Zonas en blanco</p>
            <p className="mt-0.5 max-w-xl text-xs text-zinc-500">
              Municipios sin una sola petición en el periodo. El mapa de
              temperatura no los calienta: no es que no haya problemas, es que
              aún no hay cobertura.
            </p>
          </div>
          <div className="flex items-baseline gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                En blanco
              </p>
              <p className="text-3xl font-semibold tabular-nums text-zinc-900">
                {enBlanco}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                Índice de cobertura
              </p>
              <p className="text-3xl font-semibold tabular-nums text-guinda">
                {cobertura}%
              </p>
            </div>
            <p className="text-xs text-zinc-500">
              {conPeticion} de {total} municipios con al menos una petición
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-guinda to-magenta"
            style={{ width: `${cobertura}%` }}
          />
        </div>
      </div>

      <div className="grid gap-px bg-zinc-100 sm:grid-cols-2 lg:grid-cols-4">
        {regiones.map((r) => {
          const pct = r.total ? Math.round((r.activas / r.total) * 100) : 0;
          const vacia = r.activas === 0;
          return (
            <div key={r.region} className="bg-white p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-zinc-800">{r.region}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    vacia
                      ? "bg-zinc-200 text-zinc-600"
                      : "bg-guinda/10 text-guinda"
                  }`}
                >
                  {vacia ? "Sin presencia" : `${r.activas}/${r.total}`}
                </span>
              </div>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${
                    vacia
                      ? "bg-zinc-300"
                      : "bg-gradient-to-r from-guinda to-magenta"
                  }`}
                  style={{ width: `${Math.max(pct, vacia ? 4 : 0)}%` }}
                />
              </div>
              <p className="text-[11px] leading-4 text-zinc-500">
                {vacia
                  ? `${r.blancas.length} municipios sin peticiones`
                  : r.blancas.length === 0
                    ? "Cobertura completa en el periodo"
                    : `Faltan ${r.blancas
                        .slice(0, 3)
                        .map((m) => m.corto)
                        .join(", ")}${
                        r.blancas.length > 3 ? ` y ${r.blancas.length - 3} más` : ""
                      }`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 border-t border-zinc-100 p-5 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Regiones sin presencia
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Ahí el ITC no sirve: hay que abrir gira, no leer el mapa.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sinPresencia.map((r) => (
              <span
                key={r.region}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
              >
                {r.region}
                <span className="ml-1 text-zinc-400">{r.total}</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Huecos junto a zona activa
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Municipios en blanco pegados a regiones donde ya hay peticiones:
            siguiente gira de menor costo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {huecosJuntoActiva.slice(0, 10).map((m) => (
              <span
                key={m.cveMun}
                className="rounded-full border border-guinda/20 bg-guinda/5 px-3 py-1 text-xs text-guinda"
              >
                {m.corto}
              </span>
            ))}
            {huecosJuntoActiva.length > 10 ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
                +{huecosJuntoActiva.length - 10}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
