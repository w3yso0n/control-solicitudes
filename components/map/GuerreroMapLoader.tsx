"use client";

import dynamic from "next/dynamic";
import type { ScoreZonaCumplimiento } from "@/lib/cumplimiento";
import type { ItcScore, Peticion } from "@/lib/types";
import type { ModoMapa } from "./GuerreroMap";

const GuerreroMap = dynamic(() => import("./GuerreroMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.15em] text-zinc-400">
      Cargando mapa…
    </div>
  ),
});

export default function GuerreroMapLoader(props: {
  scores: ItcScore[];
  peticiones: Peticion[];
  scoresCumplimiento?: ScoreZonaCumplimiento[];
  onMunicipioClick?: (cveMun: string, nombre: string) => void;
  regionResaltada?: string | null;
  modo?: ModoMapa;
}) {
  return <GuerreroMap {...props} />;
}
