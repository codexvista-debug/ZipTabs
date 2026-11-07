import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";
import { sanitizeStoragePath } from "@/lib/storage";

/**
 * Authenticated File Upload Gateway
 * Requires an active ziptabs_session HttpOnly cookie.
 * Performs path traversal sanitization and uploads files via server-side service role client.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Active session required to upload files." },
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
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    const path = (formData.get("path") as string || "").trim();

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid file payload." },
        { status: 400 }
      );
    }

    const sanitizedPath = sanitizeStoragePath(path);
    if (!sanitizedPath) {
      return NextResponse.json(
        { success: false, error: "Invalid storage path." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";

    const { error: uploadError } = await db.storage
      .from("note-attachments")
      .upload(sanitizedPath, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Storage Upload] Error:", uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, path });
  } catch (err: any) {
    console.error("[Storage Upload] Exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to upload file." },
      { status: 500 }
    );
  }
}
