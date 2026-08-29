import { relations } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  passwordHash: text("password_hash").notNull(),
  role: text("role", {
    enum: ["territorio", "cuantiva", "candidata", "admin"],
  })
    .notNull()
    .default("territorio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lotes = pgTable(
  "lotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fechaEntrega: text("fecha_entrega").notNull(),
    eventoOrigen: text("evento_origen").notNull(),
    cveMun: text("cve_mun").notNull(),
    notas: text("notas"),
    estatus: text("estatus", { enum: ["abierto", "cerrado"] })
      .notNull()
      .default("cerrado"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("lotes_user_id_idx").on(table.userId)],
);

export const loteDocumentos = pgTable(
  "lote_documentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loteId: uuid("lote_id")
      .notNull()
      .references(() => lotes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nombreArchivo: text("nombre_archivo").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    estatus: text("estatus", { enum: ["pendiente", "capturado"] })
      .notNull()
      .default("pendiente"),
    peticionId: uuid("peticion_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("lote_documentos_lote_id_idx").on(table.loteId),
    index("lote_documentos_user_id_idx").on(table.userId),
    index("lote_documentos_storage_key_idx").on(table.storageKey),
    uniqueIndex("lote_documentos_peticion_id_uidx").on(table.peticionId),
  ],
);

export const peticiones = pgTable(
  "peticiones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    folio: text("folio").notNull().unique(),
    documentoId: uuid("documento_id")
      .notNull()
      .unique()
      .references(() => loteDocumentos.id, { onDelete: "cascade" }),
    capturadoPor: uuid("capturado_por")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ciudadanoNombre: text("ciudadano_nombre").notNull(),
    ciudadanoTelefono: text("ciudadano_telefono").notNull(),
    descripcion: text("descripcion").notNull(),
    transcripcion: text("transcripcion").notNull(),
    categoriaId: text("categoria_id").notNull(),
    subcategorias: jsonb("subcategorias").$type<string[]>().notNull(),
    tipo: text("tipo", {
      enum: [
        "queja",
        "peticion",
        "propuesta",
        "requerimiento",
        "reconocimiento",
      ],
    }).notNull(),
    urgencia: text("urgencia", { enum: ["alta", "media", "baja"] }).notNull(),
    alcance: text("alcance", {
      enum: ["individual", "familiar", "colectivo"],
    }).notNull(),
    firmantes: integer("firmantes"),
    cveMun: text("cve_mun").notNull(),
    coloniaId: text("colonia_id"),
    eventoOrigen: text("evento_origen").notNull(),
    fechaEntrega: text("fecha_entrega").notNull(),
    fechaCaptura: timestamp("fecha_captura").defaultNow().notNull(),
    estatus: text("estatus", {
      enum: ["recibida", "capturada", "archivada"],
    })
      .notNull()
      .default("capturada"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("peticiones_documento_id_idx").on(table.documentoId),
    index("peticiones_capturado_por_idx").on(table.capturadoPor),
    index("peticiones_cve_mun_idx").on(table.cveMun),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  lotes: many(lotes),
  loteDocumentos: many(loteDocumentos),
  peticiones: many(peticiones),
}));

export const lotesRelations = relations(lotes, ({ one, many }) => ({
  user: one(users, { fields: [lotes.userId], references: [users.id] }),
  documentos: many(loteDocumentos),
}));

export const loteDocumentosRelations = relations(
  loteDocumentos,
  ({ one }) => ({
    lote: one(lotes, {
      fields: [loteDocumentos.loteId],
      references: [lotes.id],
    }),
    user: one(users, {
      fields: [loteDocumentos.userId],
      references: [users.id],
    }),
    peticion: one(peticiones, {
      fields: [loteDocumentos.peticionId],
      references: [peticiones.id],
    }),
  }),
);

export const peticionesRelations = relations(peticiones, ({ one }) => ({
  documento: one(loteDocumentos, {
    fields: [peticiones.documentoId],
    references: [loteDocumentos.id],
  }),
  capturista: one(users, {
    fields: [peticiones.capturadoPor],
    references: [users.id],
  }),
}));

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Lote = InferSelectModel<typeof lotes>;
export type NewLote = InferInsertModel<typeof lotes>;
export type LoteDocumento = InferSelectModel<typeof loteDocumentos>;
export type NewLoteDocumento = InferInsertModel<typeof loteDocumentos>;
export type PeticionRow = InferSelectModel<typeof peticiones>;
export type NewPeticion = InferInsertModel<typeof peticiones>;
