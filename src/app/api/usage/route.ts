import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";

/**
 * /api/usage
 * Authenticated Usage & System Metrics Gateway.
 * Strictly requires an active ziptabs_session HttpOnly cookie.
 * Shields workspace storage files and database statistics from public anon access.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized: Active session required." }, { status: 401 });
  }

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const { data, error } = await db.rpc("get_workspace_usage");
    if (error) {
      console.error("Error fetching workspace usage RPC:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || {
        storage_bytes: 0,
        storage_files: 0,
        invoices_count: 0,
        notes_count: 0,
        drive_files_count: 0,
        database_size_bytes: 0,
        files: [],
      },
    });
  } catch (err: any) {
    console.error("Workspace usage gateway exception:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to load usage data" }, { status: 500 });
  }
}
