import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";
import { sanitizeStoragePath } from "@/lib/storage";

const SIGNED_URL_TTL_SECONDS = 7200; // 2 hours

/**
 * Batch Signed URL Resolver
 * Resolves multiple file paths to high-speed CDN signed URLs in a single round-trip.
 * Strictly requires an active ziptabs_session HttpOnly cookie.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Active session required." },
      { status: 401 }
    );
  }

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Storage service offline." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const rawPaths: unknown = body.paths;

    if (!Array.isArray(rawPaths) || rawPaths.length === 0) {
      return NextResponse.json({ success: true, urls: {} });
    }

    // Sanitize and filter paths (limit to 100 per batch)
    const validPaths = rawPaths
      .map((p) => (typeof p === "string" ? sanitizeStoragePath(p) : null))
      .filter((p): p is string => Boolean(p))
      .slice(0, 100);

    if (validPaths.length === 0) {
      return NextResponse.json({ success: true, urls: {} });
    }

    const { data, error } = await db.storage
      .from("note-attachments")
      .createSignedUrls(validPaths, SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      console.error("Batch signed URL error:", error);
      return NextResponse.json(
        { success: false, error: error?.message || "Failed to batch resolve URLs." },
        { status: 500 }
      );
    }

    const urlMap: Record<string, string> = {};
    for (const item of data) {
      if (item.path && item.signedUrl) {
        urlMap[item.path] = item.signedUrl;
      }
    }

    return NextResponse.json(
      { success: true, urls: urlMap },
      {
        headers: {
          "Cache-Control": "private, max-age=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (err: any) {
    console.error("Batch resolution error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to batch resolve URLs." },
      { status: 500 }
    );
  }
}
