"use client";

import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NuevoLotePage() {
  const { eventos, agregarLote, cerrarLote } = useStore();
  const router = useRouter();
  const [fechaEntrega, setFechaEntrega] = useState("2026-08-14");
  const [eventoId, setEventoId] = useState("");
  const [lugar, setLugar] = useState("");
  const [notas, setNotas] = useState("");
  const [archivos, setArchivos] = useState<{ nombre: string; url: string }[]>([]);

  function onFiles(list: FileList | null) {
    if (!list) return;
    const next = [...archivos];
    for (const file of Array.from(list)) {
      next.push({ nombre: file.name, url: URL.createObjectURL(file) });
    }
    setArchivos(next);
  }

  function guardar(cerrar: boolean) {
    const id = agregarLote({
      fechaEntrega,
      eventoId: eventoId || undefined,
      lugar: lugar || eventos.find((e) => e.id === eventoId)?.lugar || "Territorio",
      notas,
      archivos:
        archivos.length > 0
          ? archivos
          : [{ nombre: "oficio-placeholder.jpg", url: "/scans/oficio-1.jpg" }],
    });
    if (cerrar) cerrarLote(id);
    router.push("/territorio");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Nuevo lote</h1>
        <p className="text-sm text-zinc-500">
          Fecha, lugar y escaneados. Al cerrar, el lote entra a la bandeja
          Cuantiva.
        </p>
      </div>
      <Card className="space-y-4 p-5">
        <Field label="Fecha de entrega">
          <Input
            type="date"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
          />
        </Field>
        <Field label="Evento o gira">
          <Select
            value={eventoId}
            onChange={(e) => {
              setEventoId(e.target.value);
              const ev = eventos.find((x) => x.id === e.target.value);
              if (ev) setLugar(ev.lugar);
            }}
          >
            <option value="">Otro / captura libre</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lugar">
          <Input
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="Colonia, municipio o sede"
          />
        </Field>
        <Field label="Notas">
          <Textarea
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </Field>
        <Field label="Escaneados">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onFiles(e.target.files)}
          />
        </Field>
        {archivos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {archivos.map((a) => (
              <div key={a.url} className="overflow-hidden rounded border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.nombre} className="h-24 w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2 pt-2">
          <Button type="button" onClick={() => guardar(true)}>
            Cerrar lote y enviar a Cuantiva
          </Button>
          <Button type="button" variant="secondary" onClick={() => guardar(false)}>
            Guardar abierto
          </Button>
        </div>
      </Card>
    </div>
  );
}
