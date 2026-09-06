"use client";

import { Card } from "@/components/ui";
import type { BalanceCumplimiento } from "@/lib/cumplimiento";
import Link from "next/link";

type Segmento = {
  key: string;
  label: string;
  value: number;
  href: string;
  className: string;
};

export function BalanceBar({
  balance,
  titulo = "Capa de balance",
}: {
  balance: BalanceCumplimiento;
  titulo?: string;
}) {
  const segmentos: Segmento[] = [
    {
      key: "cumplidas",
      label: "Cumplidas",
      value: balance.cumplidas,
      href: "/cumplimientos?vista=cumplidas",
      className: "bg-emerald-600",
    },
    {
      key: "enGestion",
      label: "En gestión",
      value: balance.enGestion,
      href: "/cumplimientos?vista=sin_cumplir&estatus=en_gestion",
      className: "bg-sky-500",
    },
    {
      key: "pendientes",
      label: "Pendientes",
      value: balance.pendientes,
      href: "/cumplimientos?vista=sin_cumplir&estatus=recibida",
      className: "bg-ambar",
    },
    {
      key: "compromisos",
      label: "Compromisos",
      value: balance.compromisos,
      href: "/cumplimientos?vista=balance",
      className: "bg-guinda",
    },
  ];
  const total = Math.max(
    1,
    balance.cumplidas + balance.enGestion + balance.pendientes + balance.compromisos,
  );

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-guinda">
            {titulo}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-900">
            {balance.tasa}% de las gestionables ya están cumplidas
          </p>
        </div>
        <Link
          href="/cumplimientos?vista=sin_cumplir&complejidad=simple"
          className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
        >
          {balance.simplesPendientes} simples pendientes
          {balance.simplesFrias > 0
            ? ` · ${balance.simplesFrias} frías (+30 d)`
            : ""}
        </Link>
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-zinc-100">
        {segmentos.map((s) =>
          s.value > 0 ? (
            <div
              key={s.key}
              className={s.className}
              style={{ width: `${(s.value / total) * 100}%` }}
              title={`${s.label}: ${s.value}`}
            />
          ) : null,
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
        {segmentos.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className="inline-flex items-center gap-1.5 hover:text-zinc-900"
          >
            <span className={`h-2 w-2 rounded-full ${s.className}`} />
            <strong className="tabular-nums text-zinc-800">{s.value}</strong>{" "}
            {s.label.toLowerCase()}
          </Link>
        ))}
        {balance.noProcede > 0 ? (
          <span className="text-zinc-400">
            <strong className="tabular-nums">{balance.noProcede}</strong> no
            proceden
          </span>
        ) : null}
      </div>
    </Card>
  );
}
