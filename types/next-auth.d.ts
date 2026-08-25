import type { Rol } from "@/lib/types";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Rol;
    } & DefaultSession["user"];
  }

  interface User {
    role: Rol;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Rol;
  }
}
