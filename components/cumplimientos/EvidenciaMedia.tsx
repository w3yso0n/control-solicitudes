"use client";

import { esVideoEvidencia } from "@/lib/evidencia-media";
import { Play } from "lucide-react";

export function EvidenciaMedia({
  url,
  alt = "Evidencia",
  className,
  mode = "thumb",
}: {
  url: string;
  alt?: string;
  className?: string;
  mode?: "thumb" | "preview";
}) {
  if (esVideoEvidencia(url)) {
    if (mode === "preview") {
      return (
        <video
          src={url}
          controls
          autoPlay
          playsInline
          className={className}
        />
      );
    }
    return (
      <span className={`relative block overflow-hidden ${className ?? ""}`}>
        <video
          src={url}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-tinta/70 text-white">
            <Play size={14} fill="currentColor" />
          </span>
        </span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={className} />
  );
}
