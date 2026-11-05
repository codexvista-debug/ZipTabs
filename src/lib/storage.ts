/**
 * Utility helpers for resolving secure, authenticated file and image URLs.
 * Routes all file viewing, previews, and downloads through the protected /api/storage/file gateway.
 */

export function getSecureFileUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  const clean = pathOrUrl.trim();
  if (!clean) return "";

  // Already routed through the secure gateway
  if (clean.startsWith("/api/storage/file")) {
    return clean;
  }

  // Full URL from Supabase (e.g. legacy stored public_url)
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return `/api/storage/file?url=${encodeURIComponent(clean)}`;
  }

  // Storage path (e.g. "drive/folder/123_file.pdf" or "noteId/456_img.png")
  return `/api/storage/file?path=${encodeURIComponent(clean)}`;
}

export function getSecureDownloadUrl(pathOrUrl?: string | null, filename?: string): string {
  const base = getSecureFileUrl(pathOrUrl);
  if (!base) return "";

  const separator = base.includes("?") ? "&" : "?";
  let url = `${base}${separator}download=true`;
  if (filename) {
    url += `&filename=${encodeURIComponent(filename)}`;
  }
  return url;
}
