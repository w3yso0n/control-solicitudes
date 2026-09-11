export const EVIDENCIA_VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const EVIDENCIA_VIDEO_EXT: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export const MAX_EVIDENCIA_IMAGEN_BYTES = 8 * 1024 * 1024;
export const MAX_EVIDENCIA_VIDEO_BYTES = 50 * 1024 * 1024;

export const ACCEPT_EVIDENCIA =
  "image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v";

export function esVideoEvidencia(url: string): boolean {
  const clean = url.split("?")[0]?.split("#")[0] ?? url;
  const ext = clean.split(".").pop()?.toLowerCase() ?? "";
  return Boolean(EVIDENCIA_VIDEO_EXT[ext]);
}

export function limiteEvidenciaBytes(file: File): number {
  if (EVIDENCIA_VIDEO_MIME.has(file.type) || esVideoEvidencia(file.name)) {
    return MAX_EVIDENCIA_VIDEO_BYTES;
  }
  return MAX_EVIDENCIA_IMAGEN_BYTES;
}
