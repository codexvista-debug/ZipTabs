import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";

/**
 * Authenticated Directory Gateway
 * Strictly requires an active ziptabs_session HttpOnly cookie.
 * Shields phone_directory from anonymous public Supabase queries.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Active session required." },
      { status: 401 }
    );
  }

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const { data, error } = await db
      .from("phone_directory")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

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
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const action = body.action || "upsert";

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: "Missing record ID." }, { status: 400 });
      }

      const { error } = await db.from("phone_directory").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "batch_insert") {
      const records = body.records;
      if (!Array.isArray(records) || records.length === 0) {
        return NextResponse.json({ success: true, count: 0 });
      }

      const { error } = await db.from("phone_directory").insert(records);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: records.length });
    }

    // Single upsert / update
    const record = body.record;
    if (!record) {
      return NextResponse.json({ success: false, error: "Missing record data." }, { status: 400 });
    }

    if (record.id) {
      // Check if updating existing
      const { data: updated, error } = await db
        .from("phone_directory")
        .upsert(record)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: updated });
    } else {
      const { data: inserted, error } = await db
        .from("phone_directory")
        .insert(record)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: inserted });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
