"use client";

import { createWorker } from "tesseract.js";

// Cached client worker for ultra-fast, in-browser OCR extractions
let cachedWorkerPromise: Promise<any> | null = null;
let currentProgressCallback: ((progress: number) => void) | null = null;

async function getOCRWorker() {
  if (!cachedWorkerPromise) {
    cachedWorkerPromise = (async () => {
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m && typeof m.progress === "number") {
            const pct = Math.round(m.progress * 100);
            if (currentProgressCallback) {
              currentProgressCallback(pct);
            }
          }
        },
      });
      return worker;
    })().catch((err) => {
      cachedWorkerPromise = null;
      throw err;
    });
  }
  return cachedWorkerPromise;
}

export async function extractTextFromImageFile(
  fileOrUrl: File | Blob | string,
  onProgress?: (progress: number) => void
): Promise<string> {
  currentProgressCallback = onProgress || null;

  try {
    const worker = await getOCRWorker();

    // Recognize with 40s safety timeout to accommodate slower cold starts
    const recognitionPromise = worker.recognize(fileOrUrl);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Extraction took too long. Please ensure your internet is active and try again.")),
        40000
      )
    );

    const ret: any = await Promise.race([recognitionPromise, timeoutPromise]);
    const rawText = ret?.data?.text || "";

    // Clean up excessive whitespace while preserving line structure
    const cleanedText = rawText
      .split("\n")
      .map((line: string) => line.trimEnd())
      .filter((line: string, idx: number, arr: string[]) => {
        if (line.trim().length > 0) return true;
        return idx > 0 && arr[idx - 1].trim().length > 0;
      })
      .join("\n")
      .trim();

    return cleanedText;
  } catch (err) {
    // Reset worker if an unexpected failure happens
    try {
      const oldWorker = await cachedWorkerPromise;
      if (oldWorker) {
        await oldWorker.terminate();
      }
    } catch {}
    cachedWorkerPromise = null;
    throw err;
  } finally {
    currentProgressCallback = null;
  }
}
