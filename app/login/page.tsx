"use client";

import { HOME_POR_ROL } from "@/lib/catalogos";
import { useSession } from "@/lib/session";
import type { Rol } from "@/lib/types";
import { Button, Field, Input } from "@/components/ui";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

function rolDesdeUsuario(usuario: string): Rol {
  const clave = usuario.trim().toLowerCase();
  if (clave === "territorio" || clave === "cuantiva" || clave === "admin") {
    return clave;
  }
  return "candidata";
}

export default function LoginPage() {
  const { setRol } = useSession();
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    void password;
    const rol = rolDesdeUsuario(usuario);
    setRol(rol);
    router.replace(HOME_POR_ROL[rol]);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-guinda lg:block">
        <Image
          src="/brand/foto-perfil.png"
          alt="Beatriz Mojica"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-guinda via-guinda/70 to-guinda/30" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-sm uppercase tracking-[0.25em] text-white/70">
            Guerrero
          </p>
          <p className="mt-2 max-w-md text-3xl font-semibold leading-tight">
            Sistema de gestión de peticiones ciudadanas
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center bg-zinc-50 px-6 py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 rounded-lg bg-guinda px-10 py-10 text-center">
            <Image
              src="/brand/foto-perfil.png"
              alt="Beatriz Mojica"
              width={72}
              height={72}
              className="mx-auto mb-6 h-16 w-16 rounded-full object-cover ring-2 ring-white/40"
              priority
            />
            <Image
              src="/brand/logo-wordmark.png"
              alt="BE4TRIZ MOJICA"
              width={480}
              height={480}
              className="mx-auto w-full max-w-[220px] object-contain"
              priority
            />
          </div>
          <form onSubmit={entrar} className="space-y-4">
            <Field label="Usuario">
              <Input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuario"
                autoComplete="username"
              />
            </Field>
            <Field label="Contraseña">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <Button type="submit" className="w-full py-2.5">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
