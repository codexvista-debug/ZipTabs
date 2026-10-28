import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import path from "path";
import fs from "fs";

// Shared worker singleton for ultra-fast, near-instant OCR (~25ms per image after warm-up)
let cachedWorkerPromise: Promise<any> | null = null;

async function getWorker() {
  if (!cachedWorkerPromise) {
    cachedWorkerPromise = (async () => {
      // Must be a real absolute path on disk for Node worker_threads
      const workerPath = path.resolve(
        process.cwd(),
        "node_modules",
        "tesseract.js",
        "src",
        "worker-script",
        "node",
        "index.js"
      );

      const options: Record<string, any> = {
        workerPath,
      };

      const worker = await createWorker("eng", 1, options);
      return worker;
    })().catch((err) => {
      cachedWorkerPromise = null; // Allow retry on subsequent request
      throw err;
    });
  }
  return cachedWorkerPromise;
}

export async function POST(req: NextRequest) {
  try {
    let imageBuffer: Buffer | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "No image file provided in form data." },
          { status: 400 }
        );
      }

      const arrayBuffer = await (file as Blob).arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      const { imageUrl, base64 } = body;

      if (base64) {
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(cleanBase64, "base64");
      } else if (imageUrl) {
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) {
          return NextResponse.json(
            { error: `Failed to download image from URL (status ${imageRes.status}).` },
            { status: 400 }
          );
        }
        const arrayBuffer = await imageRes.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      } else {
        return NextResponse.json(
          { error: "Provide either imageUrl or base64 in request body." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported Content-Type. Use multipart/form-data or application/json." },
        { status: 400 }
      );
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return NextResponse.json(
        { error: "Provided image file is empty." },
        { status: 400 }
      );
    }

    // Get warmed singleton worker
    const worker = await getWorker();

    // Recognize with 20s safety timeout to prevent hanging
    const recognitionPromise = worker.recognize(imageBuffer);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OCR extraction timed out after 20s")), 20000)
    );

    const ret: any = await Promise.race([recognitionPromise, timeoutPromise]);
    const rawText = ret?.data?.text || "";

    // Clean up excessive whitespace while preserving paragraphs
    const cleanedText = rawText
      .split("\n")
      .map((line: string) => line.trimEnd())
      .filter((line: string, idx: number, arr: string[]) => {
        if (line.trim().length > 0) return true;
        return idx > 0 && arr[idx - 1].trim().length > 0;
      })
      .join("\n")
      .trim();

    return NextResponse.json({
      success: true,
      text: cleanedText,
      confidence: ret?.data?.confidence || 0,
    });
  } catch (error: any) {
    console.error("OCR Extraction Error:", error);
    // If worker encountered fatal error, reset singleton
    if (error?.message?.includes("Worker") || error?.message?.includes("timed out")) {
      cachedWorkerPromise = null;
    }
    return NextResponse.json(
      { error: error?.message || "Failed to extract text from image." },
      { status: 500 }
    );
  }
}
