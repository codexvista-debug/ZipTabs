import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

/**
 * /api/ai
 * Unified Neural Gateway for ZipTabs.
 * Powered by Groq Cloud (Ultra-Fast LPUs) & Google Gemini (Multimodal Vision & 1M Context).
 * Restricted to authenticated Chief sessions.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const isChief =
    session.username?.toLowerCase() === "chief" ||
    session.role === "Chief Administrator";

  if (!isChief) {
    return NextResponse.json(
      { success: false, error: "Access strictly restricted to Chief Administrator." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      provider = "groq",
      prompt,
      model,
      systemPrompt,
      imageBase64,
      mimeType,
      maxTokens = 4096,
    } = body;

    if (!prompt && !imageBase64) {
      return NextResponse.json(
        { success: false, error: "Prompt or image input is required." },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // 1. GROQ PROVIDER (Ultra-fast inference on LPUs)
    if (provider === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: "Groq API Key is not configured on server." },
          { status: 500 }
        );
      }

      const selectedModel = model || "qwen/qwen3.8-27b";
      const messages: Array<{ role: string; content: string }> = [];

      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature: 0.5,
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return NextResponse.json(
          { success: false, error: errJson?.error?.message || `Groq API responded with HTTP ${res.status}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      const text = data.choices?.[0]?.message?.content || "";

      return NextResponse.json({
        success: true,
        text,
        latencyMs,
        model: selectedModel,
        provider: "groq",
      });
    }

    // 2. GEMINI PROVIDER (Multimodal Vision & High-Capacity Reasoning)
    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: "Gemini API Key is not configured on server." },
          { status: 500 }
        );
      }

      const selectedModel = model || "gemini-2.5-flash";
      const parts: any[] = [];

      if (imageBase64) {
        parts.push({
          inlineData: {
            data: imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, ""),
            mimeType: mimeType || "image/png",
          },
        });
      }

      const fullPrompt = systemPrompt ? `${systemPrompt}\n\nTask: ${prompt}` : prompt;
      if (fullPrompt) {
        parts.push({ text: fullPrompt });
      }

      const contents = [{ parts }];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: maxTokens,
            },
          }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return NextResponse.json(
          { success: false, error: errJson?.error?.message || `Gemini API responded with HTTP ${res.status}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return NextResponse.json({
        success: true,
        text,
        latencyMs,
        model: selectedModel,
        provider: "gemini",
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported provider: ${provider}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("AI API Gateway error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process AI inference." },
      { status: 500 }
    );
  }
}
