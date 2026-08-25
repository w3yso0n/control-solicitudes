import type { NextAuthConfig } from "next-auth";
import type { Rol } from "@/lib/types";

const ROLES: Rol[] = ["territorio", "cuantiva", "candidata", "admin"];

function asRol(value: unknown): Rol {
  if (typeof value === "string" && ROLES.includes(value as Rol)) {
    return value as Rol;
  }
  return "territorio";
}

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = asRol("role" in user ? user.role : undefined);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = asRol(token.role);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
