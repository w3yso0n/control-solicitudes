"use client";

import { Button, Card } from "@/components/ui";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { useEffect, useState } from "react";

export function AvisoExito({
  abierto,
  titulo,
  mensaje,
  onCerrar,
}: {
  abierto: boolean;
  titulo: string;
  mensaje?: string;
  onCerrar: () => void;
}) {
  const [montado, setMontado] = useState(abierto);
  const [visible, setVisible] = useState(false);
  const [entro, setEntro] = useState(false);

  useEffect(() => {
    if (abierto) {
      setMontado(true);
      const frame = requestAnimationFrame(() => {
        setVisible(true);
        setEntro(true);
      });
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const t = setTimeout(() => {
      setMontado(false);
      setEntro(false);
    }, 450);
    return () => clearTimeout(t);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onKey);
    const auto = window.setTimeout(onCerrar, 3200);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(auto);
    };
  }, [abierto, onCerrar]);

  useBodyScrollLock(abierto);

  if (!montado) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity ease-out ${
        visible
          ? "opacity-100 duration-150"
          : "pointer-events-none opacity-0 duration-[450ms]"
      }`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="absolute inset-0 bg-tinta/45 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onCerrar}
      />
      <Card
        className={`aviso-exito-card relative z-10 w-full max-w-sm p-6 text-center ${
          visible ? "is-in" : entro ? "is-out" : "opacity-0"
        }`}
      >
        <span className="aviso-exito-icon mx-auto flex h-16 w-16 items-center justify-center text-emerald-700">
          <span className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-emerald-100" />
            <svg
              className="relative h-16 w-16"
              viewBox="0 0 52 52"
              fill="none"
              aria-hidden
            >
              <circle
                className="aviso-exito-ring"
                cx="26"
                cy="26"
                r="22"
                stroke="currentColor"
                strokeWidth="2.25"
              />
              <path
                className="aviso-exito-check"
                d="M16.5 27.2l6.8 6.8 12.4-13.6"
                stroke="currentColor"
                strokeWidth="3.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
        <p className="mt-4 text-sm font-semibold text-zinc-900">{titulo}</p>
        {mensaje ? (
          <p className="mt-1 text-sm leading-6 text-zinc-600">{mensaje}</p>
        ) : null}
        <div className="mt-5">
          <Button type="button" className="w-full" onClick={onCerrar}>
            Listo
          </Button>
        </div>
      </Card>
    </div>
  );
}
