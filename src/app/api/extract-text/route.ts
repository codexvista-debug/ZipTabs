import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAiApiKey } from "@/lib/aiVault";

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower.startsWith("127.") ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc00:") ||
    lower.startsWith("fd") ||
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

        let currentUrl = parsedUrl;
        let imageRes: Response | null = null;
        let hops = 0;
        const MAX_REDIRECTS = 3;

        while (hops <= MAX_REDIRECTS) {
          if (currentUrl.protocol !== "https:") {
            return NextResponse.json(
              { success: false, error: "Only secure HTTPS image URLs are permitted." },
              { status: 400 }
            );
          }

          if (isPrivateOrLoopbackHost(currentUrl.hostname)) {
            return NextResponse.json(
              { success: false, error: "Access to internal, loopback, or cloud metadata addresses is forbidden." },
              { status: 403 }
            );
          }

          imageRes = await fetch(currentUrl.toString(), {
            redirect: "manual",
            signal: AbortSignal.timeout(10000), // 10s timeout
          });

          // Defend against SSRF bypass via open redirects
          if ([301, 302, 303, 307, 308].includes(imageRes.status)) {
            const location = imageRes.headers.get("location");
            if (!location) {
              return NextResponse.json(
                { success: false, error: "Redirect target missing location header." },
                { status: 400 }
              );
            }
            try {
              currentUrl = new URL(location, currentUrl);
            } catch {
              return NextResponse.json(
                { success: false, error: "Malformed redirect URL target." },
                { status: 400 }
              );
            }
            hops++;
            continue;
          }

          break;
        }

        if (!imageRes || !imageRes.ok) {
          return NextResponse.json(
            { success: false, error: `Failed to download image (status ${imageRes?.status || "error"}).` },
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

    let rawText = "";

    // 1. Primary: Google Gemini 2.5 Multimodal Vision (Private & End-to-End Encrypted via Server Vault)
    const geminiKey = await getAiApiKey("gemini");
    if (geminiKey) {
      try {
        const mime = base64Image.match(/^data:([a-zA-Z0-9/+-]+);base64,/)?.[1] || "image/png";
        const cleanBase64 = base64Image.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "");

        const prompt =
          "Extract all text, numbers, receipts, table columns, notes, and handwriting visible in this image verbatim. Preserve line breaks and alignment. Return ONLY the raw extracted text without any preamble, conversational commentary, or markdown formatting.";

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inlineData: { data: cleanBase64, mimeType: mime } },
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
          console.warn(`[OCR] Gemini Vision responded with HTTP ${geminiRes.status}`);
        }
      } catch (geminiErr) {
        console.warn("[OCR] Gemini Vision exception:", geminiErr);
      }
    }

    // 2. Optional Authenticated Fallback: Only if private OCR_SPACE_API_KEY is explicitly configured
    if (!rawText && process.env.OCR_SPACE_API_KEY) {
      try {
        const ocrFormData = new FormData();
        ocrFormData.append("base64Image", base64Image);
        ocrFormData.append("apikey", process.env.OCR_SPACE_API_KEY);
        ocrFormData.append("language", "eng");
        ocrFormData.append("isOverlayRequired", "false");
        ocrFormData.append("scale", "true");
        ocrFormData.append("detectOrientation", "true");

        const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          body: ocrFormData,
        });

        if (ocrResponse.ok) {
          const ocrData = await ocrResponse.json();
          if (!ocrData.IsErroredOnProcessing) {
            rawText = ocrData.ParsedResults?.[0]?.ParsedText || "";
          }
        }
      } catch (ocrErr) {
        console.warn("[OCR] OCR.space fallback error:", ocrErr);
      }
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cloud vision extraction unavailable. In-browser client OCR will take over.",
        },
        { status: 422 }
      );
    }

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
