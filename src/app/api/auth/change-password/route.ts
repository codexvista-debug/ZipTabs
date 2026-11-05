import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { verifyPassword, hashPassword } from "@/lib/crypto";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized: Active session required." }, { status: 401 });
  }

  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const username = (body.username || "").trim().toLowerCase();
    const oldPassword = (body.oldPassword || "").trim();
    const newPassword = (body.newPassword || "").trim();

    if (!username || !oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Username, current password, and new password are required." },
        { status: 400 }
      );
    }

    if (session.username.toLowerCase() !== username && session.role !== "Chief Administrator") {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot change another user's password." },
        { status: 403 }
      );
    }

    if (newPassword.length < 3) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 3 characters." },
        { status: 400 }
      );
    }

    const { data: userRecord, error: userErr } = await db
      .from("app_users")
      .select("id, username, password")
      .ilike("username", username)
      .maybeSingle();

    if (userErr || !userRecord) {
      return NextResponse.json({ success: false, error: "User account not found." }, { status: 404 });
    }

    const isMatch = await verifyPassword(oldPassword, userRecord.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: "Current password does not match." }, { status: 401 });
    }

    const secureHash = await hashPassword(newPassword);
    const { error: updateErr } = await db
      .from("app_users")
      .update({ password: secureHash })
      .eq("id", userRecord.id);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to change password." }, { status: 500 });
  }
}
