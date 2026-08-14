"use client";

import dynamic from "next/dynamic";
import type { ItcScore } from "@/lib/types";

const GuerreroMap = dynamic(() => import("./GuerreroMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
      Cargando mapa…
    </div>
  ),
});

export default function GuerreroMapLoader(props: {
  scores: ItcScore[];
  coloniaScores: ItcScore[];
}) {
  return <GuerreroMap {...props} />;
}
