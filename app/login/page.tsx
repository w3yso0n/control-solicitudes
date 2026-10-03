"use client";

import { Button, Field, Input } from "@/components/ui";
import { CLAVE_DEMO, USUARIOS_DEMO } from "@/lib/mock/demo-usuarios";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(USUARIOS_DEMO[0]?.email ?? "");
  const [password, setPassword] = useState(CLAVE_DEMO);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Correo o contraseña incorrectos");
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-guinda lg:block">
        <Image
          src="/brand/foto-perfil.png"
          alt="Nexo Cuantiva"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-guinda via-guinda/70 to-guinda/30" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-sm uppercase tracking-[0.25em] text-white/70">
            Ciudad de México
          </p>
          <p className="mt-2 max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Nexo Cuantiva, alcaldía por alcaldía
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center bg-hueso px-6 py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 rounded-[1.75rem] bg-[#5b21b6] px-10 py-10 text-center shadow-[0_20px_40px_-20px_rgba(91,33,182,0.5)]">
            <Image
              src="/brand/foto-perfil.png"
              alt="Nexo Cuantiva"
              width={72}
              height={72}
              className="mx-auto mb-6 h-16 w-16 rounded-full object-cover ring-2 ring-white/40"
              priority
            />
            <p className="text-2xl font-semibold tracking-tight text-white">
              Nexo Cuantiva
            </p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-white/60">
              Ciudad de México
            </p>
          </div>
          <form onSubmit={entrar} className="space-y-4">
            <Field label="Correo">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Contraseña">
              <div className="relative">
                <Input
                  type={mostrarPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 transition-colors hover:text-zinc-700"
                  aria-label={
                    mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {error ? (
              <p className="text-sm text-guinda" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full py-2.5" disabled={enviando}>
              {enviando ? "Entrando…" : "Entrar"}
            </Button>
            <p className="text-center text-sm text-zinc-500">
              <Link href="/solicitar" className="text-guinda hover:underline">
                Levantar una solicitud sin cuenta
              </Link>
            </p>
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-zinc-600">
              <p className="font-medium text-zinc-800">Demostración</p>
              <p className="mt-1">
                Contraseña <span className="font-medium">{CLAVE_DEMO}</span> para
                cualquiera de estas cuentas:
              </p>
              <ul className="mt-2 space-y-1">
                {USUARIOS_DEMO.map((cuenta) => (
                  <li key={cuenta.id}>
                    <button
                      type="button"
                      className="text-left text-guinda hover:underline"
                      onClick={() => {
                        setEmail(cuenta.email);
                        setPassword(CLAVE_DEMO);
                      }}
                    >
                      {cuenta.email}
                    </button>
                    <span className="text-zinc-400"> · {cuenta.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
