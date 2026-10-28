"use client";

import { createWorker } from "tesseract.js";

// Cached client worker for in-browser OCR fallback
let cachedBrowserWorker: any = null;

async function runBrowserTesseractOCR(
  fileOrUrl: File | Blob | string,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!cachedBrowserWorker) {
    cachedBrowserWorker = await createWorker("eng", 1, {
      logger: (m) => {
        if (m && typeof m.progress === "number") {
          onProgress?.(Math.round(m.progress * 100));
        }
      },
    });
  }

  const ret = await cachedBrowserWorker.recognize(fileOrUrl);
  const rawText = ret?.data?.text || "";

  return rawText
    .split("\n")
    .map((line: string) => line.trimEnd())
    .filter((line: string, idx: number, arr: string[]) => {
      if (line.trim().length > 0) return true;
      return idx > 0 && arr[idx - 1].trim().length > 0;
    })
    .join("\n")
    .trim();
}

export async function extractTextFromImageFile(
  fileOrUrl: File | Blob | string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Strategy 1: Fast cloud OCR via /api/extract-text (no wasm download overhead)
  try {
    onProgress?.(25);
    const formData = new FormData();

    if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
      formData.append("file", fileOrUrl);
    } else if (typeof fileOrUrl === "string") {
      formData.append("imageUrl", fileOrUrl);
    }

    const abortCtrl = new AbortController();
    const timer = setTimeout(() => abortCtrl.abort(), 12000);

    const res = await fetch("/api/extract-text", {
      method: "POST",
      body: formData,
      signal: abortCtrl.signal,
    });

    clearTimeout(timer);
    onProgress?.(70);

    // Guard against HTML error pages (e.g. 404/500 <!DOCTYPE html>)
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (data?.success && typeof data?.text === "string") {
        onProgress?.(100);
        return data.text;
      }
    }
  } catch (serverErr) {
    console.warn("Server OCR failed, attempting client WebAssembly fallback:", serverErr);
  }

  // Strategy 2: Client-side in-browser WebAssembly OCR fallback
  try {
    onProgress?.(80);
    const clientText = await runBrowserTesseractOCR(fileOrUrl, onProgress);
    onProgress?.(100);
    return clientText;
  } catch (clientErr) {
    console.error("All OCR methods failed:", clientErr);
    throw new Error(
      "Could not extract text from this image. Please ensure the image is clear and try again."
    );
  }
}
