"use client";

import { SessionProvider } from "@/lib/session";
import { StoreProvider } from "@/lib/store";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <StoreProvider>{children}</StoreProvider>
    </SessionProvider>
  );
}
