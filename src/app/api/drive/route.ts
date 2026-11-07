import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";

/**
 * /api/drive
 * Authenticated Drive Gateway.
 * Strictly requires an active ziptabs_session HttpOnly cookie.
 * Protects drive files and folders from public anon inspection/manipulation.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    // Mode: Expiring files only (for Dashboard widgets)
    if (mode === "expiring") {
      const { data, error } = await db
        .from("drive_files")
        .select("id, name, size, type, storage_path, expires_at")
        .eq("retention_type", "temporary")
        .order("expires_at", { ascending: true });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, expiringFiles: data || [] });
    }

    // Default: Fetch folders, files, and expiring files
    const [foldersRes, filesRes, expiringRes] = await Promise.all([
      db.from("drive_folders").select("*").order("name", { ascending: true }),
      db.from("drive_files").select("*").order("created_at", { ascending: false }),
      db
        .from("drive_files")
        .select("id, name, size, type, storage_path, expires_at")
        .eq("retention_type", "temporary")
        .order("expires_at", { ascending: true }),
    ]);

    if (foldersRes.error || filesRes.error) {
      const errMsg = foldersRes.error?.message || filesRes.error?.message || "Failed to load drive items";
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      folders: foldersRes.data || [],
      files: filesRes.data || [],
      expiringFiles: expiringRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const action = body.action || "create_file";

    // 1. Create Folder
    if (action === "create_folder") {
      const folder = body.folder;
      if (!folder || !folder.id || !folder.name) {
        return NextResponse.json({ success: false, error: "Folder payload required." }, { status: 400 });
      }

      const { data, error } = await db.from("drive_folders").insert([folder]).select().single();
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, folder: data });
    }

    // 2. Delete Folder
    if (action === "delete_folder") {
      const id = body.id;
      if (!id) {
        return NextResponse.json({ success: false, error: "Folder ID required." }, { status: 400 });
      }

      const { error } = await db.from("drive_folders").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id });
    }

    // 3. Create File
    if (action === "create_file") {
      const file = body.file;
      if (!file || !file.id || !file.name) {
        return NextResponse.json({ success: false, error: "File payload required." }, { status: 400 });
      }

      const { data, error } = await db.from("drive_files").insert([file]).select().single();
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, file: data });
    }

    // 4. Update File (e.g. folder move, recycle, restore)
    if (action === "update_file") {
      const id = body.id;
      const updates = body.updates;
      if (!id || !updates) {
        return NextResponse.json({ success: false, error: "File ID and updates required." }, { status: 400 });
      }

      const { data, error } = await db
        .from("drive_files")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, file: data });
    }

    // 5. Delete Files (single or multiple)
    if (action === "delete_files") {
      const ids: string[] = body.ids || (body.id ? [body.id] : []);
      const storagePath = body.storage_path;

      if (ids.length > 0) {
        const { error } = await db.from("drive_files").delete().in("id", ids);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, count: ids.length });
      }

      if (storagePath) {
        const { error } = await db.from("drive_files").delete().eq("storage_path", storagePath);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, storage_path: storagePath });
      }

      return NextResponse.json({ success: false, error: "No ids or storage_path provided." }, { status: 400 });
    }

    // 6. Purge Expired Files Safeguard
    if (action === "purge_expired") {
      const nowIso = new Date().toISOString();
      const { data: expired, error: fetchErr } = await db
        .from("drive_files")
        .select("id, storage_path")
        .eq("retention_type", "temporary")
        .lt("expires_at", nowIso);

      if (fetchErr) {
        return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
      }

      if (expired && expired.length > 0) {
        const ids = expired.map((e) => e.id);
        const { error: delErr } = await db.from("drive_files").delete().in("id", ids);
        if (delErr) {
          return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          purged: expired,
          count: expired.length,
        });
      }

      return NextResponse.json({ success: true, purged: [], count: 0 });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
