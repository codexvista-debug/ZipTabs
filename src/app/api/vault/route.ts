import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";
import { unwrapVaultField } from "@/lib/vaultEnvelope";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

/**
 * /api/vault
 * High-security gateway for encrypted vault credentials.
 * Access is strictly enforced server-side for authenticated Chief sessions only.
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

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database service unavailable." },
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
  const unwrappedRows = rows.map((row: any) => {
    try {
      const passRes = unwrapVaultField(row.encrypted_password);
      const notesRes = row.encrypted_notes
        ? unwrapVaultField(row.encrypted_notes)
        : { value: null, wasWrapped: false };
      return {
        ...row,
        encrypted_password: passRes.value,
        encrypted_notes: notesRes.value,
      };
    } catch {
      return row;
    }
  });

  return NextResponse.json(
    { success: true, data: unwrappedRows },
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

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database service unavailable." },
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

    const dbPayload = {
      id: cleanId,
      owner_username: "chief",
      title: String(payload.title || "").trim(),
      category: String(payload.category || "General").trim(),
      username: String(payload.username || "").trim(),
      encrypted_password: encPass,
      iv: iv,
      url: payload.url ? String(payload.url).trim() : null,
      encrypted_notes: payload.encrypted_notes ? String(payload.encrypted_notes).trim() : null,
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

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database service unavailable." },
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
