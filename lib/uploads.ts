import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_FILES_PER_LOTE = 20;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

export type SavedUpload = {
  storageKey: string;
  absolutePath: string;
  nombreArchivo: string;
  mimeType: string;
  sizeBytes: number;
};

function uploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
}

function extensionOf(filename: string): string {
  const ext = path.extname(filename).replace(".", "").toLowerCase();
  return ext;
}

export function resolveMimeType(file: File): string | null {
  if (file.type === "image/svg+xml") return null;
  if (ALLOWED_MIME.has(file.type)) return file.type;
  const mapped = MIME_BY_EXT[extensionOf(file.name)];
  return mapped && ALLOWED_MIME.has(mapped) ? mapped : null;
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return (base || "archivo").slice(0, 120);
}

export async function saveLoteFile(
  loteId: string,
  file: File,
): Promise<{ error: string } | SavedUpload> {
  if (file.size <= 0) {
    return { error: `El archivo ${file.name} está vacío` };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: `${file.name} supera el límite de 8 MB` };
  }

  const mimeType = resolveMimeType(file);
  if (!mimeType) {
    return {
      error: `${file.name}: formato no permitido (JPG, PNG, WebP, HEIC o PDF)`,
    };
  }

  const nombreArchivo = sanitizeFilename(file.name);
  const ext = extensionOf(nombreArchivo);
  const unique = `${randomUUID()}${ext ? `.${ext}` : ""}`;
  const storageKey = path.posix.join("lotes", loteId, unique);
  const absolutePath = path.join(uploadRoot(), "lotes", loteId, unique);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return {
    storageKey,
    absolutePath,
    nombreArchivo,
    mimeType,
    sizeBytes: file.size,
  };
}

export async function removeSavedUploads(files: SavedUpload[]) {
  await Promise.all(
    files.map((f) => unlink(f.absolutePath).catch(() => undefined)),
  );
}

export async function removeLoteDir(loteId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(loteId)) return;
  const root = uploadRoot();
  const dir = path.resolve(root, "lotes", loteId);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (dir !== root && !dir.startsWith(rootWithSep)) return;
  await rm(dir, { recursive: true, force: true });
}

export function absolutePathForStorageKey(storageKey: string): string | null {
  if (!storageKey || storageKey.includes("\0")) return null;
  const normalized = storageKey.replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.includes("..")) return null;

  const root = uploadRoot();
  const absolute = path.resolve(root, normalized);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (absolute !== root && !absolute.startsWith(rootWithSep)) return null;
  return absolute;
}

export function publicUploadUrl(storageKey: string): string {
  return `/api/uploads/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}
