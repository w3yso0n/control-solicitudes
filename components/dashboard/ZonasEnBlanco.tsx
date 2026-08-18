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

export function ZonasEnBlanco({
  cvesActivos,
  regionResaltada = null,
  onRegionClick,
}: {
  cvesActivos: Set<string>;
  regionResaltada?: RegionGuerrero | null;
  onRegionClick?: (region: RegionGuerrero) => void;
}) {
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
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-zinc-100 bg-gradient-to-r from-guinda/[0.04] to-transparent px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Regiones en blanco</p>
            <p className="mt-0.5 max-w-sm text-xs text-zinc-500">
              Municipios sin una sola petición: no es que no haya problemas,
              es que aún no hay cobertura. Clic en una región para verla en el
              mapa.
            </p>
          </div>
          <div className="flex shrink-0 items-baseline gap-4 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                En blanco
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
                {enBlanco}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                Cobertura
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-guinda">
                {cobertura}%
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-guinda to-magenta"
            style={{ width: `${cobertura}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-zinc-100 lg:grid-cols-4">
        {regiones.map((r) => {
          const pct = r.total ? Math.round((r.activas / r.total) * 100) : 0;
          const vacia = r.activas === 0;
          const activa = regionResaltada === r.region;
          return (
            <button
              key={r.region}
              type="button"
              onClick={() => onRegionClick?.(r.region)}
              className={`bg-white p-3.5 text-left transition-colors hover:bg-guinda/[0.03] ${
                activa ? "bg-guinda/[0.06] ring-2 ring-inset ring-guinda/40" : ""
              }`}
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <p className="truncate text-xs font-medium text-zinc-800">
                  {r.region}
                </p>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    vacia
                      ? "bg-zinc-200 text-zinc-600"
                      : "bg-guinda/10 text-guinda"
                  }`}
                >
                  {vacia ? "0%" : `${r.activas}/${r.total}`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${
                    vacia
                      ? "bg-zinc-300"
                      : "bg-gradient-to-r from-guinda to-magenta"
                  }`}
                  style={{ width: `${Math.max(pct, vacia ? 4 : 0)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto grid gap-3 border-t border-zinc-100 p-4 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Sin presencia
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sinPresencia.length === 0 ? (
              <span className="text-xs text-zinc-400">Ninguna</span>
            ) : (
              sinPresencia.map((r) => (
                <button
                  key={r.region}
                  type="button"
                  onClick={() => onRegionClick?.(r.region)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    regionResaltada === r.region
                      ? "bg-guinda text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {r.region}
                </button>
              ))
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Siguiente gira (menor costo)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {huecosJuntoActiva.slice(0, 6).map((m) => (
              <span
                key={m.cveMun}
                className="rounded-full border border-guinda/20 bg-guinda/5 px-2.5 py-1 text-[11px] text-guinda"
              >
                {m.corto}
              </span>
            ))}
            {huecosJuntoActiva.length > 6 ? (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-500">
                +{huecosJuntoActiva.length - 6}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
