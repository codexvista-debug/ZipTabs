import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { hashPassword, verifyPassword, isLegacyPasswordHash } from "@/lib/crypto";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { getClientIp, getClientCountry } from "@/lib/serverIp";

// Pre-computed PBKDF2 hash used to neutralize username enumeration timing side-channels
const DUMMY_PBKDF2_HASH =
  "pbkdf2:100000:f83d9147e539976d75fc613147ffcd8a:55a1b272c3b6fb3fb596e3d0cebf91a5b30f444e5c7ef50a1be9b7e9a6db2485";



export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const clientCountry = getClientCountry(req);

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

    const db = supabaseAdmin || supabase;
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Authentication database offline." },
        { status: 503 }
      );
    }

    // Concurrently fetch system security settings, IP lock record, and user credentials in parallel
    const [settingsRes, lockRes, userRes] = await Promise.all([
      db
        .from("system_security_settings")
        .select("*")
        .in("id", ["global", "vanish_mode"]),
      db
        .from("auth_ip_locks")
        .select("*")
        .eq("ip", clientIp)
        .maybeSingle(),
      db
        .from("app_users")
        .select("*")
        .ilike("username", cleanUsername)
        .maybeSingle(),
    ]);

    const allSettings = settingsRes.data;
    const lockRecord = lockRes.data;
    const userRecord = userRes.data;

    // Fail-safe: if database query returned an error, do not penalize user with a strike
    if (userRes.error) {
      console.error("Database user query error:", userRes.error);
      return NextResponse.json(
        { success: false, error: "Authentication database query error. Please retry." },
        { status: 500 }
      );
    }

    const settings = allSettings?.find((s) => s.id === "global");
    const vanishSettings = allSettings?.find((s) => s.id === "vanish_mode");
    const isLockdown = Boolean(settings?.ip_lockdown_enabled || vanishSettings?.ip_lockdown_enabled);

    if (isLockdown) {
      const isAllowed = Array.isArray(settings?.allowed_ips) && settings.allowed_ips.includes(clientIp);
      if (!isAllowed) {
        return NextResponse.json(
          {
            success: false,
            locked: true,
            isLockdown: true,
            isVanishMode: true,
            vanishRedirectUrl: "https://www.wikipedia.org",
            error: "Lockdown Mode Active. Access Denied.",
          },
          { status: 403 }
        );
      }
    }

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
          // Log targeted username attempt even when blocked by lockdown
          try {
            const hist = Array.isArray(lockRecord?.attempt_history) ? lockRecord.attempt_history : [];
            const updatedHist = [
              ...hist,
              {
                timestamp: new Date().toISOString(),
                username: cleanUsername,
                userAgent: req.headers.get("user-agent") || "unknown",
                lockdownBlocked: true,
              },
            ].slice(-20);

            await db.from("auth_ip_locks").upsert({
              ip: clientIp,
              country_code: clientCountry,
              failed_attempts: lockRecord?.failed_attempts || 0,
              locked_until: lockRecord?.locked_until || null,
              last_attempt_at: new Date().toISOString(),
              attempt_history: updatedHist,
            });
          } catch {}

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

    // 2. Verify password (runs constant-time PBKDF2 to eliminate username enumeration)
    let passwordMatches = false;
    if (userRecord) {
      passwordMatches = await verifyPassword(cleanPassword, userRecord.password);
      // Auto-upgrade legacy password (plaintext or legacy SHA-256) to modern PBKDF2 in background
      if (passwordMatches && isLegacyPasswordHash(userRecord.password) && db) {
        hashPassword(cleanPassword)
          .then((newHash) => {
            db
              .from("app_users")
              .update({ password: newHash })
              .eq("id", userRecord.id)
              .then(() => {
                console.log(`[AUTH] Automatically upgraded password to PBKDF2 for user: ${userRecord.username}`);
              });
          })
          .catch((err) => {
            console.error("[AUTH] Failed to auto-upgrade password to PBKDF2:", err);
          });
      }
    } else {
      // Execute identical PBKDF2 workload (100,000 iterations) when user does not exist
      await verifyPassword(cleanPassword, DUMMY_PBKDF2_HASH);
    }

    // 3. Handle Successful Login
    if (userRecord && passwordMatches) {
      // Clear failed attempts on this IP and record authenticated account in history
      const currentHistory = Array.isArray(lockRecord?.attempt_history)
        ? lockRecord.attempt_history
        : [];
      const historyItem = {
        timestamp: new Date().toISOString(),
        username: userRecord.username,
        userAgent: req.headers.get("user-agent") || "unknown",
        success: true,
      };
      const updatedHistory = [...currentHistory, historyItem].slice(-20);

      await db.from("auth_ip_locks").upsert({
        ip: clientIp,
        country_code: clientCountry,
        failed_attempts: 0,
        locked_until: null,
        last_attempt_at: new Date().toISOString(),
        attempt_history: updatedHistory,
      });

      const sessionToken = await createSessionToken({
        id: userRecord.id,
        username: userRecord.username,
        role: userRecord.role || "Administrator",
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: userRecord.id,
          username: userRecord.username,
          role: userRecord.role || "Administrator",
        },
      });

      setSessionCookie(response, sessionToken);
      return response;
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

    await db.from("auth_ip_locks").upsert({
      ip: clientIp,
      country_code: clientCountry,
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
