"use client";

import { FilterCombobox } from "@/components/FilterCombobox";
import { Button, Card, Field } from "@/components/ui";
import { ESCENARIOS_ACUSE } from "@/lib/catalogos";
import type { PlantillasConfig } from "@/lib/services/config";
import type { PeticionConsultaDto } from "@/lib/types";
import {
  aplicarPlantilla,
  destinosParaPlantilla,
  destinatariosSegunEscenario,
  plantillaPorDefecto,
  plantillasPermitidasPorEscenario,
  puedeAbrirWhatsApp,
  telefonoVisibleConsulta,
  textoParaDestino,
  urlWaMe,
  varsPlantilla,
  type PlantillaAcuseId,
} from "@/lib/whatsapp-acuse";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function IconoWhatsApp({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.88 0 1.74.46 3.44 1.32 4.93L2 22l5.35-1.4a9.93 9.93 0 0 0 4.69 1.2h.01c5.46 0 9.91-4.44 9.91-9.89C21.96 6.43 17.5 2 12.04 2zm5.76 14.05c-.24.67-1.4 1.24-1.93 1.32-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07.99-2.35.24-.27.53-.34.71-.34.17 0 .35 0 .5.01.16.01.38-.06.59.45.22.54.75 1.85.81 1.98.07.14.11.3.02.48-.09.19-.14.3-.27.46-.14.16-.29.35-.41.47-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.89 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.6-.13.25.08 1.57.74 1.84.87.27.14.45.2.52.31.07.12.07.67-.17 1.34z" />
    </svg>
  );
}

const PLANTILLAS_OPCIONES = ESCENARIOS_ACUSE.filter(
  (e) => e.id === "A" || e.id === "B" || e.id === "C",
).map((e) => ({ id: e.id, label: e.nombre }));

export function ModalWhatsApp({
  peticion,
  plantillas,
  onCerrar,
}: {
  peticion: PeticionConsultaDto;
  plantillas: PlantillasConfig;
  onCerrar: () => void;
}) {
  const destinos = useMemo(
    () => destinatariosSegunEscenario(peticion),
    [peticion],
  );
  const opcionesPlantilla = useMemo(() => {
    const permitidas = new Set(
      plantillasPermitidasPorEscenario(peticion.escenarioAcuse),
    );
    return PLANTILLAS_OPCIONES.filter((o) => permitidas.has(o.id));
  }, [peticion.escenarioAcuse]);
  const plantillaBloqueada = opcionesPlantilla.length <= 1;
  const [plantillaId, setPlantillaId] = useState<PlantillaAcuseId>(() =>
    plantillaPorDefecto(peticion.escenarioAcuse),
  );

  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onCerrar();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onCerrar]);

  const plantilla = plantillas[plantillaId];
  const vars = varsPlantilla(peticion);
  const chats = destinosParaPlantilla(destinos, plantilla.destinatario).map(
    (destino) => {
      const mensaje = aplicarPlantilla(
        textoParaDestino(plantilla, destino.id),
        vars,
      );
      return {
        destino,
        mensaje,
        url: urlWaMe(destino.telefono, mensaje),
        rol: destino.id === "remitente" ? "Remitente" : "Peticionario",
      };
    },
  );
  const varios = chats.length > 1;

  const dialogo = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-whatsapp-titulo"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="absolute inset-0 bg-tinta/45 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onCerrar}
      />
      <Card className="relative z-10 w-full max-w-lg overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
              WhatsApp
            </p>
            <p
              id="modal-whatsapp-titulo"
              className="mt-1 font-mono text-sm font-semibold text-zinc-900"
            >
              {peticion.folio}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <Field label="Plantilla">
            <FilterCombobox
              value={plantillaId}
              onChange={(id) => setPlantillaId(id as PlantillaAcuseId)}
              options={opcionesPlantilla}
              placeholder="Elige plantilla"
              searchPlaceholder="Buscar plantilla…"
              disabled={plantillaBloqueada}
            />
            {plantillaBloqueada ? (
              <p className="mt-1 text-[11px] text-zinc-400">
                {peticion.escenarioAcuse === "A"
                  ? "Quien envía es el peticionario: solo aplica la plantilla A."
                  : "El escenario de captura solo permite esta plantilla."}
              </p>
            ) : null}
          </Field>
          {chats.length > 0 ? (
            <p className="text-sm text-zinc-600">
              {varios
                ? "Esta plantilla va a ambos. Abre cada chat por separado."
                : "Se abrirá el chat de "}
              {!varios ? (
                <>
                  <span className="font-medium text-zinc-900">
                    {chats[0].destino.label}
                  </span>
                  {" · "}
                  <span className="tabular-nums">{chats[0].destino.telefono}</span>
                </>
              ) : null}
            </p>
          ) : null}
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.destino.id}
                className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3"
              >
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                  Vista previa · {chat.rol}
                  {" · "}
                  <span className="tabular-nums">{chat.destino.telefono}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {chat.mensaje || "Esta plantilla está vacía."}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3">
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          {chats.map((chat) => (
            <button
              key={chat.destino.id}
              type="button"
              disabled={!chat.url || !chat.mensaje.trim()}
              onClick={() => {
                if (!chat.url || !chat.mensaje.trim()) return;
                window.open(chat.url, "_blank", "noopener,noreferrer");
                if (!varios) onCerrar();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#128C7E] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(18,140,126,0.55)] transition-all hover:bg-[#0e7368] hover:shadow-[0_10px_24px_-8px_rgba(18,140,126,0.55)] disabled:opacity-50 disabled:shadow-none"
            >
              <IconoWhatsApp size={16} />
              {varios ? `Abrir · ${chat.rol}` : "Abrir WhatsApp"}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialogo, document.body);
}

export function BotonWhatsApp({
  peticion,
  plantillas,
  variante = "icono",
}: {
  peticion: PeticionConsultaDto;
  plantillas: PlantillasConfig;
  variante?: "icono" | "lista";
}) {
  const [abierto, setAbierto] = useState(false);
  if (!puedeAbrirWhatsApp(peticion)) return null;

  const telefono = telefonoVisibleConsulta(peticion);
  const esLista = variante === "lista";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAbierto(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={
          esLista
            ? "inline-flex items-center justify-center gap-2 rounded-[999px] bg-[linear-gradient(135deg,#25D366,#128C7E)] px-3.5 py-1.5 text-[13px] font-medium text-white no-underline shadow-[0_3px_8px_rgba(18,140,126,0.3)]"
            : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#128C7E] transition-colors hover:bg-[#128C7E]/10"
        }
        aria-label={
          esLista
            ? `Enviar por WhatsApp a ${telefono}`
            : "Enviar por WhatsApp"
        }
        title="Enviar por WhatsApp"
      >
        {esLista ? (
          <span className="tabular-nums">{telefono}</span>
        ) : null}
        <IconoWhatsApp size={esLista ? 14 : 16} />
      </button>
      {abierto ? (
        <ModalWhatsApp
          peticion={peticion}
          plantillas={plantillas}
          onCerrar={() => setAbierto(false)}
        />
      ) : null}
    </>
  );
}
