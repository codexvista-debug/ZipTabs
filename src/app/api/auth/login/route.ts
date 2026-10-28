import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/crypto";

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((s) => s.trim());
    if (ips[0]) return ips[0];
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "127.0.0.1";
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  try {
    const body = await req.json();
    const cleanUsername = (body.username || "").trim().toLowerCase();
    const cleanPassword = (body.password || "").trim();

    if (!cleanUsername || !cleanPassword) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Authentication database offline." },
        { status: 503 }
      );
    }

    // 0. Check Master Control Security Settings (Blacklist & Lockdown Mode)
    const { data: settings } = await supabase
      .from("system_security_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    if (settings) {
      // Check if IP is explicitly blacklisted
      if (Array.isArray(settings.blacklisted_ips) && settings.blacklisted_ips.includes(clientIp)) {
        return NextResponse.json(
          {
            success: false,
            locked: true,
            ip: clientIp,
            attempts: 3,
            remainingAttempts: 0,
            lockedUntil: "2099-12-31T23:59:59Z",
            remainingMs: 999999999999,
            error: `Your IP (${clientIp}) has been permanently blacklisted by the Administrator. Access denied.`,
          },
          { status: 403 }
        );
      }

      // Check if Website Lockdown Mode is active (only allowed_ips can log in)
      if (settings.ip_lockdown_enabled) {
        const isAllowed = Array.isArray(settings.allowed_ips) && settings.allowed_ips.includes(clientIp);
        if (!isAllowed) {
          return NextResponse.json(
            {
              success: false,
              locked: true,
              ip: clientIp,
              attempts: 0,
              remainingAttempts: 0,
              lockedUntil: null,
              remainingMs: 0,
              error: `WEBSITE LOCKDOWN ACTIVE: Access is restricted strictly to authorized Administrator IP addresses. Your IP (${clientIp}) is not whitelisted.`,
            },
            { status: 403 }
          );
        }
      }
    }

    // 1. Check if IP is currently locked out
    const { data: lockRecord } = await supabase
      .from("auth_ip_locks")
      .select("*")
      .eq("ip", clientIp)
      .maybeSingle();

    if (lockRecord?.locked_until) {
      const lockedUntilMs = new Date(lockRecord.locked_until).getTime();
      const nowMs = Date.now();
      if (lockedUntilMs > nowMs) {
        const remainingMs = lockedUntilMs - nowMs;
        const hoursLeft = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutesLeft = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

        return NextResponse.json(
          {
            success: false,
            locked: true,
            ip: clientIp,
            attempts: Math.max(lockRecord.failed_attempts || 3, 3),
            remainingAttempts: 0,
            lockedUntil: lockRecord.locked_until,
            remainingMs,
            error: `Your IP (${clientIp}) is locked out from this website for 24 hours due to 3 failed password attempts. Remaining lockout: ${hoursLeft}h ${minutesLeft}m.`,
          },
          { status: 403 }
        );
      }
    }

    // 2. Fetch user from app_users
    const { data: userRecord } = await supabase
      .from("app_users")
      .select("*")
      .ilike("username", cleanUsername)
      .maybeSingle();

    let passwordMatches = false;
    if (userRecord) {
      passwordMatches = await verifyPassword(cleanPassword, userRecord.password);
      // Auto-upgrade legacy plain text password to SHA-256 hash
      if (passwordMatches && userRecord.password === cleanPassword) {
        const newHash = await hashPassword(cleanPassword);
        await supabase
          .from("app_users")
          .update({ password: newHash })
          .eq("id", userRecord.id);
      }
    }

    // 3. Handle Successful Login
    if (userRecord && passwordMatches) {
      // Clear failed attempts on this IP
      await supabase.from("auth_ip_locks").upsert({
        ip: clientIp,
        failed_attempts: 0,
        locked_until: null,
        last_attempt_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        user: {
          id: userRecord.id,
          username: userRecord.username,
          role: userRecord.role || "Administrator",
        },
      });
    }

    // 4. Handle Failed Attempt: Increment strike count
    const priorAttempts =
      lockRecord && lockRecord.locked_until && new Date(lockRecord.locked_until).getTime() <= Date.now()
        ? 0
        : lockRecord?.failed_attempts || 0;

    const currentAttempts = priorAttempts + 1;
    const isNowLocked = currentAttempts >= 3;
    const lockedUntil = isNowLocked
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    const historyItem = {
      timestamp: new Date().toISOString(),
      username: cleanUsername,
      userAgent: req.headers.get("user-agent") || "unknown",
    };
    const currentHistory = Array.isArray(lockRecord?.attempt_history)
      ? lockRecord.attempt_history
      : [];
    const updatedHistory = [...currentHistory, historyItem].slice(-20);

    await supabase.from("auth_ip_locks").upsert({
      ip: clientIp,
      failed_attempts: currentAttempts,
      locked_until: lockedUntil,
      last_attempt_at: new Date().toISOString(),
      attempt_history: updatedHistory,
    });

    if (isNowLocked) {
      return NextResponse.json(
        {
          success: false,
          locked: true,
          ip: clientIp,
          attempts: 3,
          remainingAttempts: 0,
          lockedUntil,
          remainingMs: 24 * 60 * 60 * 1000,
          error: `3 wrong passwords entered! Your IP (${clientIp}) is now locked out from this website for 24 hours.`,
        },
        { status: 403 }
      );
    }

    const remaining = 3 - currentAttempts;
    return NextResponse.json(
      {
        success: false,
        locked: false,
        ip: clientIp,
        attempts: currentAttempts,
        remainingAttempts: remaining,
        lockedUntil: null,
        error: `Incorrect credentials. Attempt ${currentAttempts} of 3 (${remaining} attempt${
          remaining === 1 ? "" : "s"
        } remaining before 24-hour IP lockout).`,
      },
      { status: 401 }
    );
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
