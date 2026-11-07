import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";
import {
  deriveChiefVaultPepper,
  unwrapVaultField,
  wrapVaultField,
} from "@/lib/vaultEnvelope";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

/**
 * /api/vault
 * High-security gateway for encrypted vault credentials.
 * Access is strictly enforced server-side for authenticated Chief sessions only.
 * Applies a second layer of server-only AES-256-GCM envelope encryption ("srv1:")
 * so database records cannot be decrypted offline even if both the DB and client bundle leak.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const isChief =
    session.username?.toLowerCase() === "chief" ||
    session.role === "Chief Administrator";

  if (!isChief) {
    return NextResponse.json(
      { success: false, error: "Access strictly restricted to Chief Administrator." },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  let vaultPepper = "";
  try {
    vaultPepper = deriveChiefVaultPepper(session.id);
  } catch (err: any) {
    console.error("Vault pepper derivation error:", err);
    return NextResponse.json(
      { success: false, error: "Server vault cryptographic configuration error." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  if (req.nextUrl.searchParams.get("mode") === "pepper") {
    return NextResponse.json(
      { success: true, vaultPepper },
      { headers: NO_STORE_HEADERS }
    );
  }

  const db = supabaseAdmin;
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database service role unavailable." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  const { data, error } = await db
    .from("vault_credentials")
    .select("*")
    .eq("owner_username", "chief")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Vault GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch vault credentials." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  const rows = data || [];
  const unwrappedRows: any[] = [];
  const rowsToEnvelopeUpgrade: any[] = [];

  for (const row of rows) {
    try {
      const passRes = unwrapVaultField(row.encrypted_password);
      const notesRes = row.encrypted_notes
        ? unwrapVaultField(row.encrypted_notes)
        : { value: null, wasWrapped: true };

      unwrappedRows.push({
        ...row,
        encrypted_password: passRes.value,
        encrypted_notes: notesRes.value,
      });

      if (!passRes.wasWrapped || (row.encrypted_notes && !notesRes.wasWrapped)) {
        rowsToEnvelopeUpgrade.push({
          ...row,
          encrypted_password: wrapVaultField(passRes.value),
          encrypted_notes: notesRes.value ? wrapVaultField(notesRes.value) : null,
        });
      }
    } catch (unwrapErr) {
      console.error(`Failed to unwrap vault row ${row.id}:`, unwrapErr);
      unwrappedRows.push(row);
    }
  }

  // Transparently upgrade any legacy non-enveloped rows in Supabase to srv1: server envelope
  if (rowsToEnvelopeUpgrade.length > 0) {
    for (const upgradedRow of rowsToEnvelopeUpgrade) {
      try {
        await db.from("vault_credentials").upsert(upgradedRow);
      } catch (upErr) {
        console.warn("Silent server envelope upgrade warning:", upErr);
      }
    }
  }

  return NextResponse.json(
    { success: true, data: unwrappedRows, vaultPepper },
    { headers: NO_STORE_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const isChief =
    session.username?.toLowerCase() === "chief" ||
    session.role === "Chief Administrator";

  if (!isChief) {
    return NextResponse.json(
      { success: false, error: "Access strictly restricted to Chief Administrator." },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  const db = supabaseAdmin;
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database service role unavailable." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const payload = await req.json();
    const cleanId = String(payload?.id || "").trim();
    const encPass = String(payload?.encrypted_password || "").trim();
    const iv = String(payload?.iv || "").trim();

    if (!cleanId) {
      return NextResponse.json(
        { success: false, error: "Credential ID is required." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (!encPass || encPass.length < 16 || !/^[A-Za-z0-9+/=]+$/.test(encPass)) {
      return NextResponse.json(
        { success: false, error: "A valid non-empty AES-GCM encrypted_password payload is required." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (!iv || iv.length < 12 || !/^[A-Za-z0-9+/=]+$/.test(iv)) {
      return NextResponse.json(
        { success: false, error: "A valid non-empty AES-GCM initialization vector (iv) is required." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const rawEncryptedNotes = payload.encrypted_notes
      ? String(payload.encrypted_notes).trim()
      : null;

    // Wrap client ciphertexts with server-only AES-256-GCM envelope ("srv1:...") before storage
    const wrappedPassword = wrapVaultField(encPass);
    const wrappedNotes = rawEncryptedNotes ? wrapVaultField(rawEncryptedNotes) : null;

    const dbPayload = {
      id: cleanId,
      owner_username: "chief",
      title: String(payload.title || "").trim(),
      category: String(payload.category || "General").trim(),
      username: String(payload.username || "").trim(),
      encrypted_password: wrappedPassword,
      iv: iv,
      url: payload.url ? String(payload.url).trim() : null,
      encrypted_notes: wrappedNotes,
      created_at: payload.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await db.from("vault_credentials").upsert(dbPayload);
    if (error) {
      console.error("Vault POST error:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Failed to save credential." },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    console.error("Vault POST exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error processing credential." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const isChief =
    session.username?.toLowerCase() === "chief" ||
    session.role === "Chief Administrator";

  if (!isChief) {
    return NextResponse.json(
      { success: false, error: "Access strictly restricted to Chief Administrator." },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  const db = supabaseAdmin;
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database service role unavailable." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Credential ID is required." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { error } = await db
      .from("vault_credentials")
      .delete()
      .eq("id", id)
      .eq("owner_username", "chief");

    if (error) {
      console.error("Vault DELETE error:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Failed to delete credential." },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    console.error("Vault DELETE exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error deleting credential." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
