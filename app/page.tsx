"use client";

import { HOME_POR_ROL } from "@/lib/catalogos";
import { useSession } from "@/lib/session";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { rol, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(rol ? HOME_POR_ROL[rol] : "/login");
  }, [ready, rol, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
      Cargando…
    </div>
  );
}
