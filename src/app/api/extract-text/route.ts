import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }

  // IPv4 link-local (cloud metadata)
  if (lower.startsWith("169.254.")) return true;

  // RFC 1918 Private ranges
  if (lower.startsWith("10.") || lower.startsWith("192.168.")) return true;
  const match172 = lower.match(/^172\.(\d+)\./);
  if (match172) {
    const octet = parseInt(match172[1], 10);
    if (octet >= 16 && octet <= 31) return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    let base64Image = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { success: false, error: "No image file provided." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await (file as Blob).arrayBuffer());
      const mime = (file as Blob).type || "image/png";
      base64Image = `data:${mime};base64,${buffer.toString("base64")}`;
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      const { imageUrl, base64 } = body;

      if (base64) {
        base64Image = base64.startsWith("data:")
          ? base64
          : `data:image/png;base64,${base64}`;
      } else if (imageUrl) {
        if (typeof imageUrl !== "string" || !imageUrl.trim()) {
          return NextResponse.json(
            { success: false, error: "Invalid image URL provided." },
            { status: 400 }
          );
        }

        let parsedUrl: URL;
        try {
          parsedUrl = new URL(imageUrl.trim());
        } catch {
          return NextResponse.json(
            { success: false, error: "Malformed image URL format." },
            { status: 400 }
          );
        }

        if (parsedUrl.protocol !== "https:") {
          return NextResponse.json(
            { success: false, error: "Only secure HTTPS image URLs are permitted." },
            { status: 400 }
          );
        }

        if (isPrivateOrLoopbackHost(parsedUrl.hostname)) {
          return NextResponse.json(
            { success: false, error: "Access to internal, loopback, or cloud metadata addresses is forbidden." },
            { status: 403 }
          );
        }

        const imageRes = await fetch(parsedUrl.toString(), {
          signal: AbortSignal.timeout(10000), // 10s timeout
        });
        if (!imageRes.ok) {
          return NextResponse.json(
            { success: false, error: `Failed to download image (status ${imageRes.status}).` },
            { status: 400 }
          );
        }
        const mime = imageRes.headers.get("content-type") || "image/png";
        if (!mime.startsWith("image/") && !mime.includes("octet-stream")) {
          return NextResponse.json(
            { success: false, error: "Remote resource is not a recognized image format." },
            { status: 400 }
          );
        }
        const buffer = Buffer.from(await imageRes.arrayBuffer());
        if (buffer.length > 15 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, error: "Image size exceeds 15 MB limit." },
            { status: 400 }
          );
        }
        base64Image = `data:${mime};base64,${buffer.toString("base64")}`;
      } else {
        return NextResponse.json(
          { success: false, error: "Provide imageUrl or base64 in request body." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported Content-Type." },
        { status: 400 }
      );
    }

    if (!base64Image) {
      return NextResponse.json(
        { success: false, error: "Empty image data." },
        { status: 400 }
      );
    }

    // Call high-accuracy cloud OCR engine
    const ocrFormData = new FormData();
    ocrFormData.append("base64Image", base64Image);
    ocrFormData.append("apikey", "helloworld");
    ocrFormData.append("language", "eng");
    ocrFormData.append("isOverlayRequired", "false");
    ocrFormData.append("scale", "true");
    ocrFormData.append("detectOrientation", "true");

    const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: ocrFormData,
    });

    if (!ocrResponse.ok) {
      return NextResponse.json(
        { success: false, error: `OCR service responded with status ${ocrResponse.status}` },
        { status: 502 }
      );
    }

    const ocrData = await ocrResponse.json();

    if (ocrData.IsErroredOnProcessing) {
      const errDetail = Array.isArray(ocrData.ErrorMessage)
        ? ocrData.ErrorMessage.join(", ")
        : ocrData.ErrorMessage || "OCR processing failed.";
      return NextResponse.json({ success: false, error: errDetail }, { status: 422 });
    }

    const rawText = ocrData.ParsedResults?.[0]?.ParsedText || "";

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
    });
  } catch (error: any) {
    console.error("API extract-text error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to extract text from image." },
      { status: 500 }
    );
  }
}
