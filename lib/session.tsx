"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Rol } from "./types";

const STORAGE_KEY = "cs-demo-rol";

type Session = {
  rol: Rol | null;
  ready: boolean;
  setRol: (rol: Rol) => void;
  logout: () => void;
};

const SessionContext = createContext<Session | null>(null);

function leerRol(): Rol | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
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

export function SessionProvider({ children }: { children: ReactNode }) {
  const [rol, setRolState] = useState<Rol | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRolState(leerRol());
    setReady(true);
    // Sesión mock: leer localStorage solo en cliente para no romper SSR.
  }, []);

  const setRol = useCallback((next: Rol) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setRolState(next);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setRolState(null);
  }, []);

  const value = useMemo(
    () => ({ rol, ready, setRol, logout }),
    [rol, ready, setRol, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
