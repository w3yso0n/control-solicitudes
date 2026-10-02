"use client";

import { MunicipioSelect } from "@/components/MunicipioSelect";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { Check, ImagePlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

export default function SolicitarPage() {
  const [esGrupo, setEsGrupo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cveMun, setCveMun] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [aviso, setAviso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [recibido, setRecibido] = useState(false);
  const trampaRef = useRef<HTMLInputElement>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!aviso) {
      setError("Acepta el aviso de privacidad para continuar.");
      return;
    }
    setEnviando(true);
    try {
      const form = new FormData();
      form.set("esGrupo", esGrupo ? "1" : "0");
      form.set("nombre", nombre);
      form.set("telefono", telefono);
      form.set("cveMun", cveMun);
      form.set("descripcion", descripcion);
      form.set("aviso", aviso ? "1" : "0");
      form.set("empresa", trampaRef.current?.value ?? "");
      if (foto) form.set("foto", foto);
      const res = await fetch("/api/publico/solicitudes", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { error?: string; recibido?: boolean };
      if (!res.ok || !data.recibido) {
        setError(data.error || "No se pudo enviar la solicitud");
        return;
      }
      setRecibido(true);
    } catch {
      setError("No se pudo enviar la solicitud");
    } finally {
      setEnviando(false);
    }
  }

  const pasos = [
    {
      titulo: "Escribes",
      texto: "De una persona, o de un comité, colonia o grupo.",
    },
    {
      titulo: "Revisamos",
      texto: "El equipo lee tu caso antes de registrarlo.",
    },
    {
      titulo: "Te avisamos",
      texto: "Si dejaste teléfono, te escribimos por WhatsApp.",
    },
  ];

  return (
    <div className="min-h-screen bg-hueso">
      <header className="bg-guinda">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/foto-perfil.png"
              alt=""
              width={72}
              height={72}
              className="h-11 w-11 rounded-full bg-white object-cover ring-2 ring-white"
              priority
            />
            <div className="rounded-2xl bg-[#830333] px-4 py-2">
              <Image
                src="/brand/logo-wordmark.png"
                alt="Beatriz Mojica"
                width={160}
                height={48}
                className="h-8 w-auto object-contain sm:h-9"
                priority
              />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">
            Guerrero
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
          <div className="lg:sticky lg:top-8">
            <div className="mb-6 inline-flex rounded-full bg-white p-2 shadow-[0_16px_40px_-24px_rgba(28,10,18,0.45)]">
              <Image
                src="/brand/foto-perfil.png"
                alt="Beatriz Mojica"
                width={320}
                height={320}
                className="h-36 w-36 rounded-full bg-white object-cover sm:h-44 sm:w-44"
                priority
              />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-guinda">
              Campaña
            </p>
            <h1 className="font-display mt-3 text-4xl leading-[1.05] tracking-tight text-tinta sm:text-5xl">
              Cuéntanos qué hace falta en tu comunidad
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-zinc-600">
              Este canal es de la campaña de Beatriz Mojica. Sirve para
              registrar tu solicitud. No es una oficina de gobierno y no
              promete una resolución institucional.
            </p>
            <ol className="mt-8 space-y-3">
              {pasos.map((paso, i) => (
                <li key={paso.titulo} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-guinda text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-tinta">
                      {paso.titulo}
                    </span>
                    <span className="mt-0.5 block text-sm leading-5 text-zinc-500">
                      {paso.texto}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {recibido ? (
            <div className="rounded-[1.75rem] border border-emerald-200 bg-white px-6 py-10 text-center shadow-[0_16px_40px_-28px_rgba(28,10,18,0.45)] sm:px-10">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <Check size={22} />
              </span>
              <p className="font-display mt-4 text-3xl text-tinta">
                Recibimos tu solicitud
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-600">
                El equipo la va a revisar. Esto todavía no es un folio. Si
                dejaste teléfono, por ahí te avisamos.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => void enviar(e)}
              className="space-y-5 rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_16px_40px_-28px_rgba(28,10,18,0.45)] sm:p-7"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  ¿De quién es la solicitud?
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1 rounded-full bg-zinc-100 p-1">
                  <button
                    type="button"
                    aria-pressed={!esGrupo}
                    onClick={() => setEsGrupo(false)}
                    className={`rounded-full px-3 py-2.5 text-sm font-semibold transition-colors ${
                      !esGrupo
                        ? "bg-white text-guinda shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    De una persona
                  </button>
                  <button
                    type="button"
                    aria-pressed={esGrupo}
                    onClick={() => setEsGrupo(true)}
                    className={`rounded-full px-3 py-2.5 text-sm font-semibold transition-colors ${
                      esGrupo
                        ? "bg-white text-guinda shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    Comunitaria
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {esGrupo
                    ? "Comité, colonia, club o grupo. Basta el nombre."
                    : "Tu nombre. El teléfono es para poder avisarte."}
                </p>
              </div>
              <Field
                label={
                  esGrupo ? "Nombre del comité, colonia o grupo" : "Tu nombre"
                }
              >
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={
                    esGrupo
                      ? "Ej. Comité de la colonia Emiliano Zapata"
                      : "Nombre y apellido"
                  }
                  required
                  maxLength={160}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Teléfono de contacto (opcional)">
                  <Input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="WhatsApp"
                    inputMode="tel"
                  />
                </Field>
                <Field label="Municipio">
                  <MunicipioSelect value={cveMun} onChange={setCveMun} />
                </Field>
              </div>
              <Field label="¿Qué solicitas?">
                <Textarea
                  rows={5}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Cuéntalo con tus palabras…"
                  required
                  maxLength={4000}
                />
              </Field>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Foto (opcional)
                </p>
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-hueso px-4 py-3 text-sm text-zinc-600 transition-colors hover:border-guinda/40 hover:text-zinc-800">
                  <ImagePlus size={18} className="shrink-0 text-guinda" />
                  <span className="min-w-0 truncate">
                    {foto ? foto.name : "Adjuntar una foto del lugar o del escrito"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="sr-only"
                    onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <input
                ref={trampaRef}
                type="text"
                name="empresa"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="hidden"
                defaultValue=""
              />
              <label className="flex items-start gap-3 rounded-2xl bg-hueso px-3.5 py-3 text-sm leading-5 text-zinc-700">
                <input
                  type="checkbox"
                  checked={aviso}
                  onChange={(e) => setAviso(e.target.checked)}
                  className="mt-0.5 accent-guinda"
                />
                <span>
                  Leí el{" "}
                  <Link
                    href="/aviso-privacidad"
                    className="font-medium text-guinda hover:underline"
                    target="_blank"
                  >
                    aviso de privacidad
                  </Link>{" "}
                  y acepto que usen estos datos para registrar la solicitud y,
                  si dejé teléfono, contactarme.
                </span>
              </label>
              {error ? (
                <p className="text-sm text-guinda" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full py-2.5" disabled={enviando}>
                {enviando ? "Enviando…" : "Enviar solicitud"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
