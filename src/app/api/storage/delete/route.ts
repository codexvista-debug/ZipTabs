import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";

/**
 * Authenticated File Deletion Gateway
 * Requires an active ziptabs_session HttpOnly cookie.
 * Deletes specified storage paths using the server-side service role client.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Active session required to delete files." },
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
      return NextResponse.json({ success: true, count: 0 });
    }

    const validPaths = rawPaths
      .filter((p): p is string => typeof p === "string" && !!p.trim() && !p.includes(".."))
      .map((p) => p.trim())
      .slice(0, 100);

    if (validPaths.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { error } = await db.storage
      .from("note-attachments")
      .remove(validPaths);

    if (error) {
      console.error("[Storage Delete] Error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: validPaths.length });
  } catch (err: any) {
    console.error("[Storage Delete] Exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete files." },
      { status: 500 }
    );
  }
}
