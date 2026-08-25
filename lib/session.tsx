"use client";

import { signOut, useSession as useAuthSession } from "next-auth/react";
import type { Rol } from "./types";

function asRol(value: unknown): Rol | null {
  if (
    value === "territorio" ||
    value === "cuantiva" ||
    value === "candidata" ||
    value === "admin"
  ) {
    return value;
  }
  return null;
}

export function useSession() {
  const { data, status } = useAuthSession();
  const rol = asRol(data?.user?.role);

  return {
    rol,
    ready: status !== "loading",
    logout: () => {
      void signOut({ callbackUrl: "/login" });
    },
  };
}
