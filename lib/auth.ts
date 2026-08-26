import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { verifyMobileToken } from "@/lib/mobile-auth";
import type { Rol } from "@/lib/types";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: Rol;
};

const ROLES: Rol[] = ["territorio", "cuantiva", "candidata", "admin"];

function asRol(value: string | null | undefined): Rol {
  if (value && ROLES.includes(value as Rol)) return value as Rol;
  return "territorio";
}

async function findUserById(userId: string) {
  const row = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row[0] ?? null;
}

async function getUserIdFromBearerToken(): Promise<string | null> {
  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  return verifyMobileToken(token);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const userId = session?.user?.id ?? (await getUserIdFromBearerToken());
  if (!userId) return null;

  const u = await findUserById(userId);
  if (!u) return null;

  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: asRol(u.role),
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
