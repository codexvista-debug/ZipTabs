import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";

/**
 * /api/notes
 * Authenticated Notes & Categories Gateway.
 * Strictly requires an active ziptabs_session HttpOnly cookie.
 * Shields private notes, reminders, categories, and attachments from public anon access.
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
    const [notesRes, categoriesRes] = await Promise.all([
      db
        .from("app_notes")
        .select("*")
        .order("created_at", { ascending: false }),
      db
        .from("app_categories")
        .select("*")
        .order("name", { ascending: true }),
    ]);

    if (notesRes.error) {
      return NextResponse.json({ success: false, error: notesRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      notes: notesRes.data || [],
      categories: categoriesRes.data || [],
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
    const action = body.action || "upsert_note";

    // 1. Upsert Note
    if (action === "upsert_note") {
      const note = body.note;
      if (!note || !note.id) {
        return NextResponse.json({ success: false, error: "Valid note payload with ID is required." }, { status: 400 });
      }

      const { data, error } = await db.from("app_notes").upsert(note).select().single();
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, note: data });
    }

    // 2. Delete Note
    if (action === "delete_note") {
      const id = body.id;
      if (!id) {
        return NextResponse.json({ success: false, error: "Note ID is required." }, { status: 400 });
      }

      const { error } = await db.from("app_notes").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id });
    }

    // 3. Upsert Category
    if (action === "upsert_category") {
      const category = body.category;
      if (!category || !category.name) {
        return NextResponse.json({ success: false, error: "Category payload required." }, { status: 400 });
      }

      const { data, error } = await db.from("app_categories").upsert(category).select().single();
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, category: data });
    }

    // 4. Delete Category
    if (action === "delete_category") {
      const id = body.id;
      if (!id) {
        return NextResponse.json({ success: false, error: "Category ID is required." }, { status: 400 });
      }

      const { error } = await db.from("app_categories").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id });
    }

    // 5. Batch Upsert Notes
    if (action === "batch_upsert_notes") {
      const notes = body.notes;
      if (!Array.isArray(notes)) {
        return NextResponse.json({ success: false, error: "Notes array required." }, { status: 400 });
      }

      const { error } = await db.from("app_notes").upsert(notes);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: notes.length });
    }

    // 6. Update Last Opened Timestamps (Cross-device sync for urgent notes)
    if (action === "update_timestamps") {
      const ids: string[] = body.ids || (body.id ? [body.id] : []);
      const timestamp = body.timestamp || new Date().toISOString();
      if (ids.length > 0) {
        const { error } = await db
          .from("app_notes")
          .update({ last_opened_at: timestamp })
          .in("id", ids);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, count: ids.length });
      }
      return NextResponse.json({ success: true, count: 0 });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
