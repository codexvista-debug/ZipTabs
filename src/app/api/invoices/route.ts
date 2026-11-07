import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";

/**
 * /api/invoices
 * Authenticated Invoices Gateway.
 * Strictly requires an active ziptabs_session HttpOnly cookie.
 * Protects invoice amounts, vendor records, and aging data from public anon access.
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
    const { data, error } = await db
      .from("invoices")
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
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const action = body.action || "import";

    // 1. Bulk Import (Replaces previous invoices dataset with fresh spreadsheet rows)
    if (action === "import") {
      const records = body.records;
      if (!Array.isArray(records)) {
        return NextResponse.json({ success: false, error: "Invalid records array" }, { status: 400 });
      }

      // Purge previous invoices
      const { error: purgeError } = await db
        .from("invoices")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (purgeError) {
        return NextResponse.json({ success: false, error: purgeError.message }, { status: 500 });
      }

      // Batch insert in chunks of 50
      const CHUNK_SIZE = 50;
      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const batch = records.slice(i, i + CHUNK_SIZE);
        const { error: insertError } = await db.from("invoices").insert(batch);
        if (insertError) {
          return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, count: records.length });
    }

    // 2. Single Upsert / Update
    if (action === "upsert") {
      const record = body.record;
      if (!record) {
        return NextResponse.json({ success: false, error: "Record payload required" }, { status: 400 });
      }

      const { data, error } = await db.from("invoices").upsert(record).select().single();
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Invoice ID required" }, { status: 400 });
    }

    const { error } = await db.from("invoices").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
