import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";

/**
 * Authenticated File Gateway
 * Strictly requires an active ziptabs_session HttpOnly cookie.
 * Generates an ephemeral signed URL to allow secure image previews
 * and authorized file downloads while blocking anonymous public access.
 */
export async function GET(req: NextRequest) {
  // 1. Double-layer session verification
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

    // Generate a 5-minute ephemeral signed URL
    const { data, error } = await db.storage
      .from("note-attachments")
      .createSignedUrl(filePath, 300, options);

    if (error || !data?.signedUrl) {
      console.error("Failed to generate signed URL:", error);
      return NextResponse.json(
        { success: false, error: error?.message || "File not found or inaccessible." },
        { status: 404 }
      );
    }

    // 307 Temporary Redirect: Preserves method and redirects browser to high-speed CDN
    return NextResponse.redirect(data.signedUrl, 307);
  } catch (err: any) {
    console.error("Storage gateway error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process storage request." },
      { status: 500 }
    );
  }
}
