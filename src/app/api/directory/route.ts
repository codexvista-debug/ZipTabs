import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";
import {
  getDirectoryKey,
  decryptSupabaseDirectoryRow,
  encryptDirectoryRecordForDb,
  RawSupabaseDirectoryRow,
} from "@/lib/directoryCrypto";

/**
 * Authenticated Directory Gateway
 * Strictly requires an active ziptabs_session HttpOnly cookie.
 * Shields phone_directory from anonymous public Supabase queries.
 * Performs transparent AES-256-GCM encryption & decryption at rest.
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

    const key = await getDirectoryKey();
    const rows: RawSupabaseDirectoryRow[] = data || [];

    const decryptedList = await Promise.all(
      rows.map(async (row) => {
        if (row.encrypted_name && row.iv) {
          try {
            return await decryptSupabaseDirectoryRow(row, key);
          } catch (err) {
            console.warn("[Directory Gateway] Could not decrypt row:", row.id, err);
            return row;
          }
        }
        return row;
      })
    );

    return NextResponse.json({ success: true, data: decryptedList });
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

    const key = await getDirectoryKey();

    if (action === "batch_insert") {
      const records = body.records;
      if (!Array.isArray(records) || records.length === 0) {
        return NextResponse.json({ success: true, count: 0 });
      }

      // Automatically encrypt any plaintext contact before database insertion
      const encryptedBatch = await Promise.all(
        records.map(async (r: any) => {
          if (r.name && !r.encrypted_name) {
            return await encryptDirectoryRecordForDb(r, key);
          }
          return r;
        })
      );

      const { error } = await db.from("phone_directory").insert(encryptedBatch);
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

    // Automatically encrypt plaintext contact if not already encrypted
    let dbPayload = record;
    if (record.name && !record.encrypted_name) {
      dbPayload = await encryptDirectoryRecordForDb(record, key);
    }

    if (dbPayload.id) {
      const { data: updated, error } = await db
        .from("phone_directory")
        .upsert(dbPayload)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const decrypted =
        updated.encrypted_name && updated.iv
          ? await decryptSupabaseDirectoryRow(updated, key).catch(() => updated)
          : updated;

      return NextResponse.json({ success: true, data: decrypted });
    } else {
      const { data: inserted, error } = await db
        .from("phone_directory")
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const decrypted =
        inserted.encrypted_name && inserted.iv
          ? await decryptSupabaseDirectoryRow(inserted, key).catch(() => inserted)
          : inserted;

      return NextResponse.json({ success: true, data: decrypted });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
