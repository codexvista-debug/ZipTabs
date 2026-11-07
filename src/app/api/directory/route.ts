import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";
import {
  getDirectoryKey,
  decryptSupabaseDirectoryRow,
  encryptDirectoryRecordForDb,
  RawSupabaseDirectoryRow,
} from "@/lib/directoryCrypto";
import { unwrapVaultField, wrapVaultField } from "@/lib/vaultEnvelope";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

function wrapDirectoryRowForStorage(row: any) {
  return {
    ...row,
    encrypted_company: row.encrypted_company ? wrapVaultField(row.encrypted_company) : row.encrypted_company,
    encrypted_name: row.encrypted_name ? wrapVaultField(row.encrypted_name) : row.encrypted_name,
    encrypted_email: row.encrypted_email ? wrapVaultField(row.encrypted_email) : row.encrypted_email,
    encrypted_phone: row.encrypted_phone ? wrapVaultField(row.encrypted_phone) : row.encrypted_phone,
    encrypted_notes: row.encrypted_notes ? wrapVaultField(row.encrypted_notes) : null,
  };
}

function unwrapDirectoryRowFromStorage(row: RawSupabaseDirectoryRow): {
  unwrapped: RawSupabaseDirectoryRow;
  needsEnvelopeUpgrade: boolean;
} {
  const cRes = unwrapVaultField(row.encrypted_company);
  const nRes = unwrapVaultField(row.encrypted_name);
  const eRes = unwrapVaultField(row.encrypted_email);
  const pRes = unwrapVaultField(row.encrypted_phone);
  const notesRes = row.encrypted_notes
    ? unwrapVaultField(row.encrypted_notes)
    : { value: "", wasWrapped: true };

  const needsEnvelopeUpgrade =
    !cRes.wasWrapped ||
    !nRes.wasWrapped ||
    !eRes.wasWrapped ||
    !pRes.wasWrapped ||
    (Boolean(row.encrypted_notes) && !notesRes.wasWrapped);

  return {
    unwrapped: {
      ...row,
      encrypted_company: cRes.value,
      encrypted_name: nRes.value,
      encrypted_email: eRes.value,
      encrypted_phone: pRes.value,
      encrypted_notes: row.encrypted_notes ? notesRes.value : null,
    },
    needsEnvelopeUpgrade,
  };
}

/**
 * Authenticated Directory Gateway
 * Strictly requires an active ziptabs_session HttpOnly cookie.
 * Shields phone_directory from anonymous public Supabase queries.
 * Performs transparent AES-256-GCM encryption & server-only srv1: envelope wrapping at rest.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Active session required." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const db = supabaseAdmin;
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database service role offline" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const { data, error } = await db
      .from("phone_directory")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const key = await getDirectoryKey();
    const rows: RawSupabaseDirectoryRow[] = data || [];
    const rowsToEnvelopeUpgrade: any[] = [];

    const decryptedList = await Promise.all(
      rows.map(async (row) => {
        if (row.encrypted_name && row.iv) {
          try {
            const { unwrapped, needsEnvelopeUpgrade } = unwrapDirectoryRowFromStorage(row);
            if (needsEnvelopeUpgrade) {
              rowsToEnvelopeUpgrade.push(wrapDirectoryRowForStorage(unwrapped));
            }
            return await decryptSupabaseDirectoryRow(unwrapped, key);
          } catch (err) {
            console.warn("[Directory Gateway] Could not decrypt row:", row.id, err);
            return row;
          }
        }
        return row;
      })
    );

    if (rowsToEnvelopeUpgrade.length > 0) {
      for (const upRow of rowsToEnvelopeUpgrade) {
        try {
          await db.from("phone_directory").upsert(upRow);
        } catch (upErr) {
          console.warn("Silent directory envelope upgrade warning:", upErr);
        }
      }
    }

    return NextResponse.json(
      { success: true, data: decryptedList },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Active session required." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const db = supabaseAdmin;
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database service role offline" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const action = body.action || "upsert";

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return NextResponse.json(
          { success: false, error: "Missing record ID." },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const { error } = await db.from("phone_directory").delete().eq("id", id);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }

      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    }

    const key = await getDirectoryKey();

    if (action === "batch_insert") {
      const records = body.records;
      if (!Array.isArray(records) || records.length === 0) {
        return NextResponse.json({ success: true, count: 0 }, { headers: NO_STORE_HEADERS });
      }

      // Encrypt any plaintext contact and wrap with server-only srv1: envelope before database insertion
      const encryptedBatch = await Promise.all(
        records.map(async (r: any) => {
          const baseRow =
            r.name && !r.encrypted_name ? await encryptDirectoryRecordForDb(r, key) : r;
          return wrapDirectoryRowForStorage(baseRow);
        })
      );

      const { error } = await db.from("phone_directory").insert(encryptedBatch);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }

      return NextResponse.json(
        { success: true, count: records.length },
        { headers: NO_STORE_HEADERS }
      );
    }

    // Single upsert / update
    const record = body.record;
    if (!record) {
      return NextResponse.json(
        { success: false, error: "Missing record data." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // Automatically encrypt plaintext contact if not already encrypted, then apply srv1: server envelope
    let dbPayload = record;
    if (record.name && !record.encrypted_name) {
      dbPayload = await encryptDirectoryRecordForDb(record, key);
    }
    const envelopedPayload = wrapDirectoryRowForStorage(dbPayload);

    if (envelopedPayload.id) {
      const { data: updated, error } = await db
        .from("phone_directory")
        .upsert(envelopedPayload)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }

      const { unwrapped } = unwrapDirectoryRowFromStorage(updated);
      const decrypted =
        unwrapped.encrypted_name && unwrapped.iv
          ? await decryptSupabaseDirectoryRow(unwrapped, key).catch(() => unwrapped)
          : unwrapped;

      return NextResponse.json({ success: true, data: decrypted }, { headers: NO_STORE_HEADERS });
    } else {
      const { data: inserted, error } = await db
        .from("phone_directory")
        .insert(envelopedPayload)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }

      const { unwrapped } = unwrapDirectoryRowFromStorage(inserted);
      const decrypted =
        unwrapped.encrypted_name && unwrapped.iv
          ? await decryptSupabaseDirectoryRow(unwrapped, key).catch(() => unwrapped)
          : unwrapped;

      return NextResponse.json({ success: true, data: decrypted }, { headers: NO_STORE_HEADERS });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
