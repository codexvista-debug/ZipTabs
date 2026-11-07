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
    if (cleanUsername.length < 3 || cleanUsername.length > 32 || !/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { success: false, error: "Username must be 3-32 characters and contain only letters, numbers, hyphens, underscores, or periods." },
        { status: 400 }
      );
    }
    if (["chief", "admin", "administrator", "root", "system"].includes(cleanUsername)) {
      return NextResponse.json({ success: false, error: "This username is reserved and cannot be registered." }, { status: 400 });
    }
    if (cleanPassword.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (cleanPassword.length > 128) {
      return NextResponse.json({ success: false, error: "Password must not exceed 128 characters." }, { status: 400 });
    }

    // Check if registrations are allowed (Strictly locked by default if settings missing)
    const { data: settings } = await db
      .from("system_security_settings")
      .select("registrations_allowed")
      .eq("id", "global")
      .maybeSingle();

    if (!settings || !settings.registrations_allowed) {
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
          role: "Member",
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
      role: newUser.role || "Member",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role || "Member",
      },
    });

    setSessionCookie(response, sessionToken);
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to register user." }, { status: 500 });
  }
}
