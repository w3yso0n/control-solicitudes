import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing[0]) {
      return NextResponse.json(
        { error: "Ese correo ya esta registrado" },
        { status: 400 },
      );
    }

    const passwordHash = await hash(password, 10);
    const inserted = await db
      .insert(users)
      .values({
        email,
        displayName: displayName || null,
        passwordHash,
        role: "territorio",
        updatedAt: new Date(),
      })
      .returning({ id: users.id, email: users.email });

    return NextResponse.json({ success: true, user: inserted[0] });
  } catch (err) {
    console.error("[API] POST /api/auth/signup:", err);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
