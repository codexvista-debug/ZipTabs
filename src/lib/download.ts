/**
 * Utility to download any file directly to the user's computer
 * without opening a new browser tab, even for cross-origin Supabase URLs.
 */
export async function downloadFileDirectly(url?: string, filename?: string): Promise<void> {
  if (!url) return;

  const safeFilename = filename || url.split("/").pop() || "download";

  try {
    // 1. Fetch file as binary blob (Same-origin blob URL enables direct browser download)
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP fetch error: ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = safeFilename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 2000);
  } catch (err) {
    console.warn("Direct blob download failed, attempting header-based download:", err);

    // 2. Fallback: For Supabase storage URLs, add ?download=filename to force Content-Disposition: attachment
    let directUrl = url;
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set("download", safeFilename);
      directUrl = urlObj.toString();
    } catch {
      directUrl = url.includes("?")
        ? `${url}&download=${encodeURIComponent(safeFilename)}`
        : `${url}?download=${encodeURIComponent(safeFilename)}`;
    }

    const link = document.createElement("a");
    link.href = directUrl;
    link.download = safeFilename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
