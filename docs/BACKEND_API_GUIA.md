# Backend Next.js + Drizzle + Postgres: guia de implementacion

Guia para replicar el mismo backend de Cuantiva en otro proyecto Next.js que hoy solo tiene datos mock. El objetivo es pasar de "datos fijos en el frontend" a **persistencia real en Postgres**, con autenticacion, servicios, y endpoints REST dentro de `app/api/`.

No es un ORM/framework nuevo: es App Router de Next.js (Route Handlers) + Drizzle ORM + Postgres, sin un backend separado. Todo vive en el mismo proyecto Next.js.

---

## 1. Arquitectura general

```
Request HTTP
  -> app/api/<recurso>/route.ts       (Route Handler: valida auth, parsea body, llama al servicio)
  -> lib/services/<recurso>.ts        (logica de negocio + queries Drizzle)
  -> lib/db/schema.ts                 (definicion de tablas)
  -> lib/db/index.ts                  (cliente Drizzle conectado a Postgres)
  -> Postgres (VPS / Coolify / Neon / Supabase / lo que uses)
```

Reglas de oro que sigue todo el proyecto:

1. **Los Route Handlers no tocan la base de datos directamente.** Solo autentican, validan el shape del body, llaman a un servicio y traducen el resultado a `NextResponse.json`.
2. **Toda la logica de negocio y las queries Drizzle viven en `lib/services/*.ts`**, una funcion por operacion (`getX`, `createX`, `updateX`, `deleteX`).
3. **Todo dato pertenece a un usuario.** Casi todas las tablas tienen `user_id` y cada query filtra por `eq(tabla.userId, userId)`. No hay "modo admin" que vea todo.
4. **Los montos de dinero se guardan en centavos** (`integer`), nunca `float`/`decimal` para evitar errores de redondeo. La excepcion es `credit_limit` que usa `decimal` porque es informativo, no se suma en cascada.
5. Nombres de columnas en Postgres: `snake_case`. Nombres de campos en TS/Drizzle: `camelCase`. Drizzle mapea uno a otro automaticamente (`userId: uuid("user_id")`).

---

## 2. Stack y dependencias

```json
{
  "dependencies": {
    "drizzle-orm": "^0.45.1",
    "postgres": "^3.4.8",
    "next-auth": "5.0.0-beta.31",
    "bcryptjs": "^3.0.3"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.9",
    "dotenv": "^16.4.7"
  }
}
```

```bash
npm i drizzle-orm postgres next-auth@beta bcryptjs
npm i -D drizzle-kit dotenv @types/bcryptjs
```

`next-auth@beta` (v5, "Auth.js") es el que se usa aqui, no v4. La API cambia bastante entre versiones, no mezcles docs de v4.

---

## 3. Base de datos: conexion y config de Drizzle

### 3.1 Variables de entorno

```env
# Postgres (cualquier proveedor: VPS propio, Neon, Supabase, Railway...)
DATABASE_URL=postgresql://usuario:password@host:5432/dbname?sslmode=require

# Auth.js (NextAuth v5) - generar con: npx auth secret
AUTH_SECRET=
```

### 3.2 `drizzle.config.ts` (raiz del proyecto)

```ts
import { config } from "dotenv";

config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 3.3 `lib/db/index.ts` (cliente Drizzle, singleton)

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL.");
}

const client = postgres(connectionString, {
  prepare: false, // necesario si el proveedor usa pgbouncer / connection pooling
  max: 1,          // 1 conexion por instancia serverless; sube si es server tradicional
});

export const db = drizzle(client);
```

Este `db` se importa en todos los servicios (`import { db } from "@/lib/db"`). Nunca crear un cliente nuevo por request.

### 3.4 Comandos de trabajo

```bash
npm run db:push     # "drizzle-kit push" -> aplica el schema.ts directo a la BD (dev, sin migraciones formales)
npm run db:studio   # "drizzle-kit studio" -> UI web para ver/editar filas
```

`package.json`:

```json
"scripts": {
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

Para esta etapa (levantar el backend desde cero) **usa `db:push`**, no migraciones (`drizzle-kit generate` + `migrate`). Es mas rapido para iterar en el schema al principio. Cuando el proyecto llegue a produccion con datos reales, migrar a migraciones versionadas es lo recomendable, pero no es parte de este alcance.

---

## 4. Definir el schema (`lib/db/schema.ts`)

Un solo archivo con todas las tablas, sus relaciones, y los tipos TS inferidos. Patron a seguir por tabla:

### 4.1 Tabla base: usuarios

Todo el sistema cuelga de `users.id` (UUID). Si el proyecto nuevo ya tiene un sistema de auth propio, esta tabla puede adaptarse, pero la convencion `user_id uuid references users(id) on delete cascade` en cada tabla hija debe mantenerse.

```ts
import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  displayName: text("display_name"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 4.2 Tabla de recurso tipico (ejemplo: `accounts`)

```ts
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["credit", "debit", "cash"] }).notNull(), // enum a nivel TS, columna text en BD
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Puntos clave:

- `serial("id")` para PK autoincremental simple (INT). `uuid(...).defaultRandom()` cuando el ID se expone en URLs publicas o necesitas generarlo antes del insert.
- `text(...).notNull()` para campos requeridos, sin `.notNull()` para opcionales.
- Enums de dominio pequeno (`credit | debit | cash`) se hacen con `text("type", { enum: [...] })`: Postgres guarda `text`, Drizzle valida el tipo en TS. No hace falta un `pgEnum` real salvo que quieras el enum tambien a nivel de constraint SQL.
- Montos: `integer("amount")` (centavos). Solo usa `decimal` para valores informativos que no se suman en agregaciones criticas (ej. limite de credito).
- Fechas de negocio (ej. "fecha del gasto") se guardan como `timestamp`, pero se manipulan como string `YYYY-MM-DD` en la capa de API (ver seccion 6.4).

### 4.3 Relaciones foraneas y unicidad compuesta

```ts
export const monthlyBudgets = pgTable(
  "monthly_budgets",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    month: text("month").notNull(), // "YYYY-MM"
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userMonthUnique: uniqueIndex("monthly_budgets_user_month_unique").on(
      table.userId,
      table.month
    ),
  })
);
```

- `onDelete: "cascade"` en la mayoria de FKs a `users` (si se borra el usuario, se borra todo lo suyo).
- `onDelete: "restrict"` cuando borrar el padre no deberia ser posible mientras haya hijos (ej. no dejar borrar una `account` que tiene `expenses` asociados).
- `onDelete: "set null"` cuando el hijo puede sobrevivir sin el padre (ej. borrar una `category` no borra el `expense`, solo le deja `category_id = null`).
- `uniqueIndex(...)` para constraints compuestos (un presupuesto por usuario y mes).
- `index(...)` simple sobre columnas que siempre filtras (tipicamente `user_id`).

### 4.4 Relations (para queries con joins tipados, opcional pero recomendado)

```ts
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
```

Esto habilita `db.query.accounts.findMany({ with: { user: true } })` si en algun momento usas la API relacional de Drizzle en vez de query builder puro. En este proyecto casi todo se resuelve con query builder (`db.select().from(...).where(...)`), las relations existen sobre todo para claridad y para casos puntuales.

### 4.5 Tipos inferidos al final del archivo

```ts
export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;
```

Un par `Select`/`Insert` por tabla. Estos tipos se usan en los servicios y, si hace falta, en el frontend para tipar las respuestas de la API.

---

## 5. Autenticacion

Este proyecto soporta **dos mecanismos en paralelo**: sesion de navegador (cookie, para la webapp) y Bearer token (para integraciones externas, ej. Atajos de iOS). Si el proyecto nuevo no necesita tokens de API, se puede omitir la parte 5.3 e implementar solo sesion.

### 5.1 `auth.ts` (raiz del proyecto) — configuracion de NextAuth v5

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const user = rows[0];
        if (!user?.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.displayName };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
```

`session.strategy: "jwt"` (no "database"): la sesion se guarda cifrada en la cookie, no en una tabla `sessions`. Mas simple, no requiere tabla adicional.

### 5.2 Route Handler de NextAuth: `app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

Con esto quedan disponibles automaticamente `/api/auth/signin`, `/api/auth/callback/credentials`, `/api/auth/session`, etc. gestionados por la libreria.

### 5.3 Signup manual (`app/api/auth/signup/route.ts`)

NextAuth no crea usuarios por si solo con el provider Credentials; el registro es un endpoint propio:

```ts
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.trim();
    const password = body.password;
    const displayName = body.displayName?.trim();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      return NextResponse.json({ error: "Ese correo ya esta registrado" }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);
    const inserted = await db
      .insert(users)
      .values({ email, displayName: displayName ?? null, passwordHash, updatedAt: new Date() })
      .returning({ id: users.id, email: users.email });

    return NextResponse.json({ success: true, user: inserted[0] });
  } catch (err) {
    console.error("[API] POST /api/auth/signup:", err);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
```

### 5.4 `lib/auth.ts` — helper central de "quien esta pegandole a la API"

Este es el archivo que **todo Route Handler importa**. Resuelve el usuario actual sin importar si vino con cookie de sesion o con Bearer token.

```ts
import { headers } from "next/headers";
import { auth } from "@/auth";
import { validateApiToken } from "@/lib/api-tokens";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

async function findUserById(userId: string) {
  const row = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row[0] ?? null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const headersList = await headers();
  const authHeader = headersList.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    const apiResult = await validateApiToken(token);
    if (apiResult) {
      const u = await findUserById(apiResult.userId);
      if (u) return { id: u.id, email: u.email, displayName: u.displayName };
    }
  }

  const session = await auth();
  if (!session?.user?.id) return null;

  const u = await findUserById(session.user.id);
  if (!u) return null;

  return { id: u.id, email: u.email, displayName: u.displayName };
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
```

**Si el proyecto nuevo no necesita Bearer tokens**, `getCurrentUserId` se simplifica a solo la parte de `auth()`. Si si los necesita, ver seccion 5.5.

### 5.5 (Opcional) Tokens de API propios (`lib/api-tokens.ts` + tabla `api_tokens`)

Para permitir integraciones externas (automatizaciones, apps de terceros) sin usar la sesion de cookie. El token nunca se guarda en claro, solo su hash SHA-256.

```ts
export const apiTokens = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  name: text("name"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});
```

```ts
// lib/api-tokens.ts
import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";

const PREFIX = "miapp_";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return PREFIX + randomBytes(32).toString("hex");
}

export async function createApiToken(userId: string, days = 30, name?: string) {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  await db.insert(apiTokens).values({ userId, tokenHash: hashToken(token), expiresAt, name: name ?? null });
  return { token, expiresAt }; // el token en claro solo se devuelve UNA vez, aqui
}

export async function validateApiToken(token: string): Promise<{ userId: string } | null> {
  if (!token.startsWith(PREFIX)) return null;
  const rows = await db
    .select({ userId: apiTokens.userId })
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, hashToken(token)), gt(apiTokens.expiresAt, new Date()), isNull(apiTokens.revokedAt)))
    .limit(1);
  return rows[0] ? { userId: rows[0].userId } : null;
}
```

### 5.6 Middleware de proteccion de rutas (`middleware.ts`, raiz del proyecto)

Protege las paginas del frontend (no las API, que se validan solas por dentro):

```ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/registro");

  if (isApiRoute) return NextResponse.next(); // las API se protegen solas dentro de cada route.ts

  if (!session?.user && !isAuthRoute) {
    const urlRedirect = request.nextUrl.clone();
    urlRedirect.pathname = "/login";
    return NextResponse.redirect(urlRedirect);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

Importante: el middleware **no** protege `/api/*`. Cada Route Handler valida `getCurrentUserId()` por su cuenta y devuelve 401. Es deliberado: asi los endpoints pueden aceptar tanto cookie como Bearer token sin que el middleware interfiera.

---

## 6. Patron de un Route Handler (`app/api/<recurso>/route.ts`)

Este es el patron que se repite en **todos** los recursos del proyecto. Cópialo tal cual para cada entidad nueva.

### 6.1 Estructura de carpetas por recurso

```
app/api/accounts/
  route.ts              GET (listar), POST (crear)
  [id]/
    route.ts             GET (uno), PATCH (actualizar), DELETE (borrar)
```

Un recurso = una carpeta. El archivo `route.ts` exporta funciones nombradas segun el metodo HTTP (`GET`, `POST`, `PATCH`, `DELETE`). El id en la URL usa carpeta dinamica `[id]`.

### 6.2 GET (listar) + POST (crear) — `app/api/accounts/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { getAccounts, createAccount } from "@/lib/services/accounts";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const accounts = await getAccounts(userId);
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("[API] GET /api/accounts:", error);
    return NextResponse.json({ error: "Error al obtener cuentas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const body = await request.json();
    const result = await createAccount(userId, {
      name: body.name,
      type: body.type,
      color: body.color ?? null,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] POST /api/accounts:", error);
    return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 });
  }
}
```

### 6.3 GET (uno) + PATCH — `app/api/accounts/[id]/route.ts`

Nota clave de Next 15/16: `params` es una **Promise**, hay que `await`la.

```ts
import { NextRequest, NextResponse } from "next/server";
import { updateAccount, getAccountById } from "@/lib/services/accounts";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = Number((await params).id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }
    if (account.userId && account.userId !== userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json(account);
  } catch (error) {
    console.error("[API] GET /api/accounts/[id]:", error);
    return NextResponse.json({ error: "Error al obtener cuenta" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = Number((await params).id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const body = await request.json();
    const result = await updateAccount(userId, id, { name: body.name, type: body.type });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] PATCH /api/accounts/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar cuenta" }, { status: 500 });
  }
}
```

El patron `DELETE` es identico: valida id, valida auth, verifica ownership (traer el registro y comparar `userId`), llama al servicio, `{ success: true }`.

### 6.4 Reglas fijas de cada Route Handler (siguelas siempre)

1. **Siempre `try/catch`** envolviendo todo el handler. En el catch: `console.error("[API] METODO /ruta:", error)` + `NextResponse.json({ error: "..." }, { status: 500 })`. Nunca dejar que un error de Postgres se filtre crudo al cliente.
2. **Orden de validaciones**: (a) parsear/validar params de la URL, (b) auth (`getCurrentUserId`, 401 si falta), (c) parsear body, (d) delegar al servicio, (e) traducir `result.error` a 400.
3. **Ownership siempre se verifica**: si el recurso tiene `userId`, comparar contra el usuario autenticado y devolver 403 si no coincide. Nunca confiar en que el `id` de la URL "ya es del usuario" solo porque esta autenticado.
4. **Los servicios devuelven `{ error: string }` en vez de lanzar excepciones** para errores de validacion de negocio (400). Las excepciones (`throw`) son solo para errores inesperados que caen al catch generico (500).
5. **Nunca pasar el `body` crudo a Drizzle.** Siempre reconstruir el objeto explicitamente (`{ name: body.name, type: body.type }`), nunca `db.insert(t).values(body)`. Esto evita que el cliente inyecte columnas como `userId` o `id`.
6. Fechas de negocio via querystring/body como string `YYYY-MM-DD`, validadas con regex antes de usarlas en SQL:
   ```ts
   typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : todayDateString()
   ```
7. Query params numericos con limite maximo, para no permitir `?limit=999999999`:
   ```ts
   const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
   ```

---

## 7. Patron de un Servicio (`lib/services/<recurso>.ts`)

Aqui vive toda la interaccion con Drizzle. Un archivo por recurso, funciones puras (reciben `userId` explicito, no leen sesion).

```ts
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getAccounts(userId: string | null) {
  if (!userId) return [];
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(accounts.name);
}

export async function getAccountById(id: number) {
  const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return result[0] ?? null;
}

export type CreateAccountInput = {
  name: string;
  type: "credit" | "debit" | "cash";
  color?: string | null;
};

export async function createAccount(userId: string, input: CreateAccountInput) {
  const { name, type, color } = input;

  if (!name?.trim()) {
    return { error: "El nombre es requerido" };
  }
  if (!type || !["credit", "debit", "cash"].includes(type)) {
    return { error: "Tipo invalido" };
  }

  await db.insert(accounts).values({ userId, name: name.trim(), color: color ?? null, type });
  return { success: true };
}

export async function updateAccount(userId: string, id: number, input: Partial<CreateAccountInput>) {
  const existing = await getAccountById(id);
  if (!existing) return { error: "Cuenta no encontrada" };
  if (existing.userId && existing.userId !== userId) return { error: "No autorizado" };

  const { name, type, color } = input;
  if (name !== undefined && !name?.trim()) return { error: "El nombre es requerido" };

  await db
    .update(accounts)
    .set({
      ...(name !== undefined && { name: name.trim() }),
      ...(type !== undefined && { type }),
      ...(color !== undefined && { color }),
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id));

  return { success: true };
}
```

Puntos clave del patron de servicio:

- **Validaciones de negocio viven aqui**, no en el Route Handler (nombre requerido, enum valido, formato de fecha, etc.).
- **Updates parciales con spread condicional** (`...(campo !== undefined && { campo: valor })`): permite mandar solo los campos que cambian sin pisar el resto con `undefined`.
- **Ownership check dentro del servicio tambien** (no solo en el handler) cuando la funcion se reutiliza desde otros lugares (ej. crons, otros servicios) que no pasan por el Route Handler.
- Los `select()` devuelven arrays; para "traer uno" siempre `.limit(1)` + `result[0] ?? null`.

### 7.1 Ejemplo de agregacion / SQL crudo cuando Drizzle no alcanza (`lib/services/dashboard.ts`)

Para sumas, agrupaciones por mes, etc. se usa `sql` de Drizzle mezclado con el query builder:

```ts
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function getTotalSpentThisMonth(userId: string, start: string, end: string) {
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::int`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        sql`DATE(${expenses.date}) >= ${start}::date`,
        sql`DATE(${expenses.date}) <= ${end}::date`
      )
    );

  return result[0]?.total ?? 0;
}
```

`sql\`...\`` con template literal interpola valores de forma segura (parametrizado, no concatenacion de strings — no hay riesgo de SQL injection). Usalo para: `SUM`, `COUNT`, `TO_CHAR`, `GROUP BY`, casts (`::int`, `::date`), y cualquier cosa que el query builder no exprese bien.

---

## 8. Endpoints de subida de archivos (opcional)

Si el proyecto nuevo necesita subir imagenes (ej. logo de cuenta, avatar), el patron aqui **no usa Drizzle para el archivo en si** — lo sube a un servicio externo (S3, o un file-server propio) y solo guarda la URL resultante en la BD.

```ts
// app/api/accounts/[id]/upload/route.ts
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const formData = await request.formData();
  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "No se envio ninguna imagen" }, { status: 400 });

  const MAX_SIZE = 2 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "La imagen no debe superar 2MB" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Formato no permitido" }, { status: 400 });

  // ... subir a S3 / file server externo, obtener imageUrl ...
  // luego: await updateAccount(userId, id, { imageUrl });

  return NextResponse.json({ imageUrl });
}
```

Reglas: validar `size` y `type` **antes** de subir. Nunca guardar el binario en Postgres (`bytea`) para imagenes de usuario; siempre un objeto externo + URL en la columna `text`.

---

## 9. Preferencias de usuario (patron de upsert 1-a-1)

Cuando necesitas "un registro de config por usuario" (tema, flags, ajustes), el patron es tabla con `user_id UNIQUE` + funcion `upsert`:

```ts
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme", { enum: ["dark", "light"] }).default("dark").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdUnique: uniqueIndex("user_preferences_user_id_unique").on(table.userId),
}));
```

```ts
// lib/services/preferences.ts
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserPreferences(userId: string) {
  const rows = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return rows[0] ?? { theme: "dark" }; // default si nunca se guardo nada
}

export async function upsertUserPreferences(userId: string, updates: Partial<{ theme: "dark" | "light" }>) {
  const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(userPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(userPreferences)
    .values({ userId, ...updates })
    .returning();
  return created;
}
```

En el Route Handler, cada campo del PATCH se valida individualmente antes de pasarlo al servicio (ver `app/api/preferences/route.ts` como referencia real en este repo si tienes acceso al codigo fuente).

---

## 10. Orden de implementacion recomendado (de cero)

1. **Instalar dependencias** (seccion 2).
2. **Crear `.env.local`** con `DATABASE_URL` (usa cualquier Postgres: local con Docker, Neon, Supabase, Railway, VPS propio) y `AUTH_SECRET` (`npx auth secret`).
3. **Crear `lib/db/index.ts`** y `drizzle.config.ts` (seccion 3).
4. **Escribir `lib/db/schema.ts`** empezando por `users` + las 2-3 tablas mas centrales del dominio (seccion 4). No hace falta modelar todo el dominio antes de arrancar; agrega tablas incrementalmente.
5. **`npm run db:push`** para crear las tablas en Postgres.
6. **Implementar auth**: `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/signup/route.ts`, `lib/auth.ts` (secciones 5.1–5.4). Omite 5.5 (tokens de API) si no hay integraciones externas todavia.
7. **`middleware.ts`** para proteger paginas (seccion 5.6).
8. **Por cada entidad del dominio** (siguiendo el orden que tenga sentido para tus dependencias FK, ej. `accounts` antes que `expenses` porque `expenses.account_id` referencia `accounts`):
   - Agregar la tabla a `schema.ts` + `db:push`.
   - Crear `lib/services/<recurso>.ts` con `getX`, `createX`, `updateX`, `deleteX` (seccion 7).
   - Crear `app/api/<recurso>/route.ts` (GET, POST) y `app/api/<recurso>/[id]/route.ts` (GET, PATCH, DELETE) (seccion 6).
9. **Reemplazar los mocks del frontend** por `fetch("/api/<recurso>")`, uno por uno, empezando por el recurso mas simple (probablemente el catalogo/listado principal).
10. **Probar con `db:studio`** que las filas se crean correctamente y con el `userId` correcto en cada insert.

No necesitas migraciones formales (`drizzle-kit generate`) ni tabla de `sessions` para esta etapa. Eso se agrega despues si el proyecto crece a necesitarlo.

---

## 11. Checklist de seguridad minima (no negociable)

- [ ] Todo Route Handler que lee/escribe datos de usuario llama `getCurrentUserId()` y devuelve 401 si es `null`.
- [ ] Todo `GET/PATCH/DELETE /recurso/[id]` verifica `existing.userId === userId` antes de devolver/modificar/borrar, con 403 si no coincide.
- [ ] Ningun `db.insert(...).values(body)` con el body crudo del cliente; siempre reconstruir el objeto campo por campo.
- [ ] Las contraseñas se hashean con `bcryptjs` (`hash(password, 10)`), nunca se guardan en claro ni se loguean.
- [ ] Los tokens de API (si existen) se guardan como hash SHA-256, el valor en claro solo se muestra una vez al crearlo.
- [ ] `try/catch` en cada handler; los errores de Postgres nunca se exponen crudos al cliente (`error.message` de Drizzle puede filtrar nombres de columnas/tablas).
- [ ] Limites en queries de listado (`limit`, tope maximo) para evitar payloads gigantes.
