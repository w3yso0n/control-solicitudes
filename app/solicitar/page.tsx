"use client";

import { MunicipioSelect } from "@/components/MunicipioSelect";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import {
  ArrowRight,
  Camera,
  Check,
  CircleAlert,
  FileText,
  ImagePlus,
  Lightbulb,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import s from "./solicitar.module.css";

const PASOS = [
  {
    titulo: "Escribes",
    texto: "Cuéntanos tu solicitud, personal o de tu comité, colonia o grupo.",
  },
  {
    titulo: "Revisamos",
    texto: "Nuestro equipo lee cada caso antes de registrarlo.",
  },
  {
    titulo: "Te informamos",
    texto: "Si dejas tu teléfono, te enviaremos tu folio por WhatsApp.",
  },
];

const SALIDA_MS = 450;

function contarPalabras(texto: string) {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

export default function SolicitarPage() {
  const [esGrupo, setEsGrupo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [nombreRegistra, setNombreRegistra] = useState("");
  const [familias, setFamilias] = useState("");
  const [cveMun, setCveMun] = useState("");
  const [colonia, setColonia] = useState("");
  const [telefono, setTelefono] = useState("");
  const [telefonoError, setTelefonoError] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [aviso, setAviso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const [modalMontado, setModalMontado] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [conTelefono, setConTelefono] = useState(false);

  const trampaRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const enviarRef = useRef<HTMLButtonElement>(null);
  const entendidoRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cierreRef = useRef<number | null>(null);

  useBodyScrollLock(modalMontado);

  const palabras = contarPalabras(descripcion);
  const textoCorto = palabras > 0 && palabras < 20;

  function limpiarFormulario() {
    setEsGrupo(false);
    setNombre("");
    setNombreGrupo("");
    setNombreRegistra("");
    setFamilias("");
    setCveMun("");
    setColonia("");
    setTelefono("");
    setTelefonoError(false);
    setDescripcion("");
    setFoto(null);
    if (fotoRef.current) fotoRef.current.value = "";
    setAviso(false);
    setError("");
  }

  function abrirModal(telefonoValido: boolean) {
    if (cierreRef.current) window.clearTimeout(cierreRef.current);
    setConTelefono(telefonoValido);
    setModalMontado(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setModalVisible(true)),
    );
  }

  const cerrarModal = useCallback((recargar = false) => {
    setModalVisible(false);
    if (cierreRef.current) window.clearTimeout(cierreRef.current);
    cierreRef.current = window.setTimeout(() => {
      if (recargar) {
        window.location.reload();
        return;
      }
      setModalMontado(false);
      enviarRef.current?.focus();
    }, SALIDA_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (cierreRef.current) window.clearTimeout(cierreRef.current);
    };
  }, []);

  useEffect(() => {
    if (!modalVisible) return;
    entendidoRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrarModal();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href]",
      );
      if (focusables.length === 0) return;
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalVisible, cerrarModal]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (telefono.length > 0 && telefono.length !== 10) {
      setTelefonoError(true);
      return;
    }
    if (!cveMun) {
      setError("Elige el municipio.");
      return;
    }
    if (!aviso) {
      setError("Acepta el aviso de privacidad para continuar.");
      return;
    }
    setEnviando(true);
    try {
      const form = new FormData();
      form.set("esGrupo", esGrupo ? "1" : "0");
      form.set("nombre", esGrupo ? nombreGrupo : nombre);
      if (esGrupo) {
        form.set("nombreGrupo", nombreGrupo);
        form.set("nombreRegistra", nombreRegistra);
        form.set("familiasBeneficiadas", familias);
      }
      form.set("telefono", telefono);
      form.set("cveMun", cveMun);
      form.set("colonia", colonia);
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
      abrirModal(telefono.length === 10);
    } catch {
      setError("No se pudo enviar la solicitud");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.headerLeft}>
            <span className={s.logo}>
              <Image
                src="/brand/logo-wordmark.png"
                alt="Beatriz Mojica"
                width={1920}
                height={1080}
                priority
              />
            </span>
            <span className={s.headerDivider} aria-hidden="true" />
            <span className={s.headerLabel}>Canal ciudadano</span>
          </div>
          <div className={s.headerRight}>
            <Link href="/aviso-privacidad" className={s.headerLink} target="_blank">
              Aviso de privacidad
            </Link>
            <span className={s.pill}>GUERRERO</span>
          </div>
        </div>
      </header>

      <main className={s.main}>
        <section className={s.intro}>
          <Image
            src="/brand/foto-perfil.png"
            alt="Beatriz Mojica"
            width={144}
            height={144}
            quality={90}
            className={s.avatar}
            priority
          />
          <p className={s.eyebrow}>Beatriz Mojica</p>
          <h1 className={s.h1}>Cuéntanos qué necesitas</h1>
          <p className={s.introText}>
            Este es un espacio de Beatriz Mojica para escuchar a las personas y
            comunidades de Guerrero. Aquí puedes registrar tu solicitud para que
            nuestro equipo la conozca y le dé seguimiento. No es una oficina de
            gobierno ni un trámite oficial.
          </p>
          <ol className={s.steps}>
            {PASOS.map((paso, i) => (
              <li key={paso.titulo} className={s.step}>
                <span className={s.stepNum}>{i + 1}</span>
                <span>
                  <span className={s.stepTitle}>{paso.titulo}</span>
                  <span className={s.stepText}>{paso.texto}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <form onSubmit={(e) => void enviar(e)} className={s.card}>
          {/* a) Tipo de solicitud */}
          <div className={s.block}>
            <span className={s.label} id="tipo-label">
              ¿De quién es la solicitud?
            </span>
            <div className={s.segmented} role="group" aria-labelledby="tipo-label">
              <button
                type="button"
                aria-pressed={!esGrupo}
                onClick={() => setEsGrupo(false)}
                className={`${s.segment} ${!esGrupo ? s.segmentActive : ""}`}
              >
                De una persona
              </button>
              <button
                type="button"
                aria-pressed={esGrupo}
                onClick={() => setEsGrupo(true)}
                className={`${s.segment} ${esGrupo ? s.segmentActive : ""}`}
              >
                Comunitaria
              </button>
            </div>
          </div>

          {/* b) Quién */}
          {esGrupo ? (
            <div className={s.gridGrupo}>
              <div className={s.block}>
                <label htmlFor="nombreGrupo" className={s.label}>
                  Nombre del comité, colonia o grupo
                </label>
                <input
                  id="nombreGrupo"
                  className={s.input}
                  value={nombreGrupo}
                  onChange={(e) => setNombreGrupo(e.target.value)}
                  placeholder="Ej. Comité de vecinos de la Col. Centro"
                  required
                  maxLength={160}
                />
              </div>
              <div className={s.block}>
                <label htmlFor="nombreRegistra" className={s.label}>
                  Quien lo registra
                </label>
                <input
                  id="nombreRegistra"
                  className={s.input}
                  value={nombreRegistra}
                  onChange={(e) => setNombreRegistra(e.target.value)}
                  placeholder="Nombre y apellido"
                  required
                  maxLength={160}
                />
              </div>
              <div className={s.block}>
                <label htmlFor="familias" className={s.label}>
                  Familias beneficiadas
                </label>
                <input
                  id="familias"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className={s.input}
                  value={familias}
                  onChange={(e) => setFamilias(e.target.value)}
                  placeholder="Número aproximado"
                />
              </div>
            </div>
          ) : (
            <div className={s.block}>
              <label htmlFor="nombre" className={s.label}>
                Tu nombre
              </label>
              <input
                id="nombre"
                className={s.input}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre y apellido"
                required
                maxLength={160}
              />
            </div>
          )}

          {/* c) Ubicación y contacto */}
          <div className={s.block}>
            <div className={s.grid3}>
              <div className={s.block}>
                <label htmlFor="municipio" className={s.label}>
                  Municipio
                </label>
                <MunicipioSelect
                  id="municipio"
                  value={cveMun}
                  onChange={setCveMun}
                  placeholder="Elegir"
                  triggerClassName={s.select}
                />
              </div>
              <div className={s.block}>
                <label htmlFor="colonia" className={s.label}>
                  Colonia o localidad
                </label>
                <input
                  id="colonia"
                  className={s.input}
                  value={colonia}
                  onChange={(e) => setColonia(e.target.value)}
                  placeholder="Ej. Col. Emiliano Zapata"
                  maxLength={160}
                />
              </div>
              <div className={s.block}>
                <label htmlFor="telefono" className={s.label}>
                  Teléfono <span className={s.labelFaint}>· opcional</span>
                </label>
                <input
                  id="telefono"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className={`${s.input} ${telefonoError ? s.inputError : ""}`}
                  value={telefono}
                  onChange={(e) => {
                    setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setTelefonoError(false);
                  }}
                  placeholder="WhatsApp (10 dígitos)"
                  aria-invalid={telefonoError}
                  aria-describedby="telefono-ayuda"
                />
              </div>
            </div>
            {telefonoError ? (
              <p id="telefono-ayuda" className={`${s.hint} ${s.hintError}`} role="alert">
                <CircleAlert size={14} aria-hidden="true" />
                El teléfono debe tener 10 dígitos.
              </p>
            ) : (
              <p id="telefono-ayuda" className={s.hint}>
                <MessageCircle size={14} aria-hidden="true" />
                Solo lo usaremos para informarte sobre tu solicitud.
              </p>
            )}
          </div>

          {/* d) ¿Qué solicitas? */}
          <div className={s.block}>
            <label htmlFor="descripcion" className={s.label}>
              ¿Qué solicitas?
            </label>
            <textarea
              id="descripcion"
              rows={4}
              className={s.textarea}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                '¿Qué pasa, dónde es y desde cuándo? Por ejemplo: "En la calle Morelos no hay alumbrado desde hace tres meses y ya hubo asaltos".'
              }
              required
              maxLength={4000}
            />
            {textoCorto ? (
              <p className={`${s.hint} ${s.hintWarning}`}>
                <Lightbulb size={14} aria-hidden="true" />
                Entre más detalles nos compartas, mejor podremos atender tu
                solicitud.
              </p>
            ) : null}
          </div>

          {/* e) Foto */}
          <div className={s.photo}>
            <div className={s.photoRow}>
              <label htmlFor="foto" className={s.photoButton}>
                <ImagePlus size={16} aria-hidden="true" />
                Adjuntar una foto
                <input
                  ref={fotoRef}
                  id="foto"
                  type="file"
                  accept="image/*"
                  className={s.srOnly}
                  onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                />
              </label>
              <p className={s.photoText}>
                {foto ? (
                  <>
                    <span className={s.photoName}>{foto.name}</span>
                    <button
                      type="button"
                      className={s.photoRemove}
                      onClick={() => {
                        setFoto(null);
                        if (fotoRef.current) fotoRef.current.value = "";
                      }}
                    >
                      Quitar
                    </button>
                  </>
                ) : (
                  "Opcional. Una foto nos ayuda a conocer mejor tu solicitud."
                )}
              </p>
            </div>
            <ul className={s.tips}>
              <li className={s.tip}>
                <Camera size={15} aria-hidden="true" />
                <span>
                  <strong>Con buena luz:</strong> de preferencia de día.
                </span>
              </li>
              <li className={s.tip}>
                <Search size={15} aria-hidden="true" />
                <span>
                  <strong>Que se vea el problema:</strong> de cerca y sin
                  objetos que estorben.
                </span>
              </li>
              <li className={s.tip}>
                <FileText size={15} aria-hidden="true" />
                <span>
                  <strong>Si es un escrito:</strong> completo, derecho y que se
                  lean las firmas.
                </span>
              </li>
            </ul>
          </div>

          <input
            ref={trampaRef}
            type="text"
            name="empresa"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className={s.trap}
            defaultValue=""
          />

          {error ? (
            <p className={s.formError} role="alert">
              {error}
            </p>
          ) : null}

          {/* f) Envío */}
          <div className={s.submitRow}>
            <label className={s.consent}>
              <input
                type="checkbox"
                checked={aviso}
                onChange={(e) => setAviso(e.target.checked)}
              />
              <span>
                Leí el{" "}
                <Link href="/aviso-privacidad" className={s.link} target="_blank">
                  aviso de privacidad
                </Link>{" "}
                y acepto que usen estos datos para registrar la solicitud y, si
                dejé teléfono, contactarme.
              </span>
            </label>
            <button
              ref={enviarRef}
              type="submit"
              className={s.primary}
              disabled={enviando}
            >
              {enviando ? "Enviando…" : "Enviar solicitud"}
              {enviando ? null : <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </div>
        </form>
      </main>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <span>Beatriz Mojica · Guerrero</span>
          <Link href="/aviso-privacidad" className={s.footerLink} target="_blank">
            Aviso de privacidad
          </Link>
        </div>
      </footer>

      {modalMontado ? (
        <div
          className={`${s.overlay} ${modalVisible ? s.overlayOpen : s.overlayClosing}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div
            ref={dialogRef}
            className={s.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="conf-title"
          >
            <div className={s.band}>
              <span className={s.bandLabel}>BEATRIZ MOJICA</span>
              <button
                type="button"
                className={s.close}
                aria-label="Cerrar"
                onClick={() => cerrarModal()}
              >
                <X size={18} aria-hidden="true" />
              </button>
              <span className={s.modalAvatar}>
                <Image
                  src="/brand/foto-perfil.png"
                  alt=""
                  width={160}
                  height={160}
                  quality={90}
                />
                <span className={s.badge} aria-hidden="true">
                  <Check size={16} strokeWidth={3} />
                </span>
              </span>
            </div>

            <div className={s.modalBody}>
              <div>
                <h2 id="conf-title" className={s.h2}>
                  Tu solicitud fue recibida
                </h2>
                <p className={s.modalText}>
                  {conTelefono
                    ? "Gracias por hacernos llegar tu solicitud. Nuestro equipo la revisará y, una vez registrada, te enviaremos por WhatsApp tu número de folio para darle seguimiento."
                    : "Gracias por hacernos llegar tu solicitud. Nuestro equipo la revisará. Como no registraste un número de contacto, no podremos informarte sobre su avance."}
                </p>
              </div>

              <div className={s.next}>
                <p className={s.nextTitle}>¿Qué sigue?</p>
                <ol className={s.timeline}>
                  <li className={s.tlItem}>
                    <span className={`${s.tlDot} ${s.tlDone}`} aria-hidden="true">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span>
                      <span className={s.tlTitle}>Recibida</span>
                      <span className={s.tlText}>Ya llegó a nuestro equipo.</span>
                    </span>
                  </li>
                  <li className={s.tlItem} aria-current="step">
                    <span className={`${s.tlDot} ${s.tlCurrent}`} aria-hidden="true" />
                    <span>
                      <span className={s.tlTitle}>En revisión</span>
                      <span className={s.tlText}>
                        Leemos tu caso antes de registrarlo.
                      </span>
                    </span>
                  </li>
                  <li className={`${s.tlItem} ${conTelefono ? "" : s.tlFaint}`}>
                    <span className={`${s.tlDot} ${s.tlPending}`} aria-hidden="true" />
                    <span>
                      <span className={s.tlTitle}>Folio por WhatsApp</span>
                      <span className={s.tlText}>
                        {conTelefono
                          ? "Te lo enviamos al registrarla."
                          : "No disponible: no dejaste teléfono."}
                      </span>
                    </span>
                  </li>
                </ol>
              </div>

              <div className={s.modalActions}>
                <button
                  ref={entendidoRef}
                  type="button"
                  className={s.primary}
                  onClick={() => cerrarModal(true)}
                >
                  Entendido
                </button>
                <button
                  type="button"
                  className={s.secondary}
                  onClick={() => {
                    limpiarFormulario();
                    cerrarModal();
                  }}
                >
                  Enviar otra solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
