import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/crypto";
import { createSessionToken, setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const cleanUsername = (body.username || "").trim().toLowerCase();
    const cleanPassword = (body.password || "").trim();

    if (!cleanUsername) {
      return NextResponse.json({ success: false, error: "Username is required." }, { status: 400 });
    }
    if (cleanPassword.length < 3) {
      return NextResponse.json({ success: false, error: "Password must be at least 3 characters." }, { status: 400 });
    }

    // Check if registrations are allowed
    const { data: settings } = await db
      .from("system_security_settings")
      .select("registrations_allowed")
      .eq("id", "global")
      .maybeSingle();

    if (settings && !settings.registrations_allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "New user registrations are currently paused and locked by the Chief Administrator.",
        },
        { status: 403 }
      );
    }

    // Check if username taken
    const { data: existing } = await db
      .from("app_users")
      .select("id")
      .ilike("username", cleanUsername)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Username '${cleanUsername}' is already taken.` },
        { status: 409 }
      );
    }

    const secureHash = await hashPassword(cleanPassword);
    const { data: newUser, error: insertError } = await db
      .from("app_users")
      .insert([
        {
          username: cleanUsername,
          password: secureHash,
          role: "Administrator",
        },
      ])
      .select("id, username, role")
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    const sessionToken = await createSessionToken({
      id: newUser.id,
      username: newUser.username,
      role: newUser.role || "Administrator",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role || "Administrator",
      },
    });

    setSessionCookie(response, sessionToken);
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to register user." }, { status: 500 });
  }
}
