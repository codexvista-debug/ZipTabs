/**
 * Utility helpers for resolving secure, authenticated file and image URLs.
 * Routes all file viewing, previews, and downloads through the protected /api/storage/file gateway.
 * Employs client-side and browser memory caching for instantaneous rendering.
 */

// Client-side cache: storagePath -> direct signed CDN URL
const clientSignedUrlCache = new Map<string, string>();

export function registerSignedUrls(urlMap: Record<string, string>) {
  for (const [path, url] of Object.entries(urlMap)) {
    if (path && url) {
      clientSignedUrlCache.set(path, url);
    }
  }
}

let activePreloadPromise: Promise<void> | null = null;
const pendingPathsToPreload = new Set<string>();

/**
 * Preloads signed URLs for a list of file paths in a single batch network call.
 * Ensures image thumbnails render immediately with zero delay.
 */
export async function preloadSignedUrls(paths: string[]): Promise<void> {
  if (typeof window === "undefined" || !Array.isArray(paths) || paths.length === 0) return;

  const needed = paths.filter((p) => p && !clientSignedUrlCache.has(p));
  if (needed.length === 0) return;

  needed.forEach((p) => pendingPathsToPreload.add(p));

  if (activePreloadPromise) return activePreloadPromise;

  activePreloadPromise = (async () => {
    try {
      // Small debounce to batch multiple component renders together
      await new Promise((r) => setTimeout(r, 10));
      const batch = Array.from(pendingPathsToPreload).slice(0, 100);
      pendingPathsToPreload.clear();

      if (batch.length === 0) return;

      const res = await fetch("/api/storage/batch-signed-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: batch }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.urls) {
          registerSignedUrls(data.urls);
        }
      }
    } catch (err) {
      console.warn("Preload signed URLs error:", err);
    } finally {
      activePreloadPromise = null;
    }
  })();

  return activePreloadPromise;
}

export function getSecureFileUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  const clean = pathOrUrl.trim();
  if (!clean) return "";

  // Check if we have a direct signed CDN URL in client memory cache
  const cached = clientSignedUrlCache.get(clean);
  if (cached) {
    return cached;
  }

  // If clean is a legacy full Supabase public URL, extract path and check cache
  if (clean.includes("/note-attachments/")) {
    const bucketMarker = "/note-attachments/";
    const markerIndex = clean.indexOf(bucketMarker);
    if (markerIndex !== -1) {
      const extractedPath = decodeURIComponent(clean.substring(markerIndex + bucketMarker.length).split("?")[0]);
      const cachedExtracted = clientSignedUrlCache.get(extractedPath);
      if (cachedExtracted) {
        return cachedExtracted;
      }
    }
  }

  // Already a signed URL from Supabase or gateway URL
  if (clean.startsWith("/api/storage/file") || clean.includes("/object/sign/")) {
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

/**
 * Securely uploads a file via the authenticated /api/storage/upload endpoint.
 */
export async function uploadFileToStorage(
  storagePath: string,
  file: File | Blob
): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", storagePath);

    const res = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Upload failed." };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Network upload error." };
  }
}

/**
 * Securely deletes files via the authenticated /api/storage/delete endpoint.
 */
export async function deleteFilesFromStorage(
  storagePaths: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const validPaths = storagePaths.filter(Boolean);
    if (validPaths.length === 0) return { success: true };

    const res = await fetch("/api/storage/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: validPaths }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Delete failed." };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Network delete error." };
  }
}
