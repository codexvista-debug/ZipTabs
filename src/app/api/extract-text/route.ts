import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";

export async function POST(req: NextRequest) {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
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
        // Strip data:image/...;base64, prefix if present
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
          { error: "Provide either imageUrl or base64 in JSON request body." },
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
        { error: "Image file is empty." },
        { status: 400 }
      );
    }

    // Initialize Tesseract worker for English OCR
    worker = await createWorker("eng");
    const { data } = await worker.recognize(imageBuffer);
    await worker.terminate();
    worker = null;

    const rawText = data?.text || "";
    // Clean up excessive whitespace while preserving line structure
    const cleanedText = rawText
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line, idx, arr) => {
        // Keep non-empty lines, or at most one blank line between paragraphs
        if (line.trim().length > 0) return true;
        return idx > 0 && arr[idx - 1].trim().length > 0;
      })
      .join("\n")
      .trim();

    return NextResponse.json({
      success: true,
      text: cleanedText,
      confidence: data?.confidence || 0,
    });
  } catch (error: any) {
    console.error("OCR Extraction Error:", error);
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
    return NextResponse.json(
      { error: error?.message || "Failed to extract text from image." },
      { status: 500 }
    );
  }
}
