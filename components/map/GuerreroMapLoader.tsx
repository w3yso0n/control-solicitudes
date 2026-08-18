"use client";

import dynamic from "next/dynamic";
import type { ItcScore, Peticion } from "@/lib/types";

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
  onMunicipioClick?: (cveMun: string, nombre: string) => void;
  regionResaltada?: string | null;
}) {
  return <GuerreroMap {...props} />;
}
