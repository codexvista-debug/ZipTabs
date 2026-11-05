import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";

// Server-side in-memory cache for generated signed URLs (prevents redundant Supabase roundtrips)
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_TTL_SECONDS = 7200; // 2 hours
const BROWSER_CACHE_SECONDS = 3600; // 1 hour browser cache

/**
 * Authenticated File Gateway
 * Strictly requires an active ziptabs_session HttpOnly cookie.
 * Generates an ephemeral signed URL to allow secure image previews
 * and authorized file downloads while blocking anonymous public access.
 */
export async function GET(req: NextRequest) {
  // 1. Session verification
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Active session required to access files." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  let filePath = (searchParams.get("path") || "").trim();
  const rawUrl = searchParams.get("url");
  const isDownload = searchParams.get("download") === "true";
  const downloadFilename = searchParams.get("filename");

  // Extract path from full Supabase URL if provided
  if (!filePath && rawUrl) {
    const bucketMarker = "/note-attachments/";
    const markerIndex = rawUrl.indexOf(bucketMarker);
    if (markerIndex !== -1) {
      filePath = decodeURIComponent(rawUrl.substring(markerIndex + bucketMarker.length).split("?")[0]);
    }
  }

  // Prevent directory traversal or invalid paths
  if (!filePath || filePath.includes("..")) {
    return NextResponse.json(
      { success: false, error: "Invalid or missing file path." },
      { status: 400 }
    );
  }

  const cacheKey = `${filePath}:${isDownload}:${downloadFilename || ""}`;
  const now = Date.now();
  const cached = signedUrlCache.get(cacheKey);

  // Return cached signed URL if valid for at least another 60 seconds
  if (cached && cached.expiresAt - now > 60000) {
    const response = NextResponse.redirect(cached.url, 307);
    response.headers.set(
      "Cache-Control",
      `private, max-age=${BROWSER_CACHE_SECONDS}, stale-while-revalidate=7200`
    );
    return response;
  }

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Storage service offline." },
      { status: 503 }
    );
  }

  try {
    const options: { download?: string | boolean } = {};
    if (isDownload || downloadFilename) {
      options.download = downloadFilename || true;
    }

    // Generate ephemeral signed URL from Supabase
    const { data, error } = await db.storage
      .from("note-attachments")
      .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS, options);

    if (error || !data?.signedUrl) {
      console.error("Failed to generate signed URL:", error);
      return NextResponse.json(
        { success: false, error: error?.message || "File not found or inaccessible." },
        { status: 404 }
      );
    }

    // Cache in memory (evict oldest if cache exceeds 1500 items)
    if (signedUrlCache.size > 1500) {
      const firstKey = signedUrlCache.keys().next().value;
      if (firstKey) signedUrlCache.delete(firstKey);
    }
    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + SIGNED_URL_TTL_SECONDS * 1000,
    });

    // 307 Temporary Redirect with private browser caching header
    const response = NextResponse.redirect(data.signedUrl, 307);
    response.headers.set(
      "Cache-Control",
      `private, max-age=${BROWSER_CACHE_SECONDS}, stale-while-revalidate=7200`
    );
    return response;
  } catch (err: any) {
    console.error("Storage gateway error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process storage request." },
      { status: 500 }
    );
  }
}
