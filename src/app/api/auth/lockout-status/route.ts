import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

export function getClientCountry(req: NextRequest): string | null {
  const vercelCountry = req.headers.get("x-vercel-ip-country");
  if (vercelCountry) return vercelCountry.toUpperCase();
  const cfCountry = req.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX") return cfCountry.toUpperCase();
  return null;
}

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const clientCountry = getClientCountry(req);

  if (!supabase) {
    return NextResponse.json({ ip: clientIp, attempts: 0, remainingAttempts: 3, locked: false });
  }

  try {
    const userAgent = req.headers.get("user-agent") || "unknown";
    const reqSessionId = req.headers.get("x-session-id")?.trim() || "";
    const reqSessionCreated = parseInt(req.headers.get("x-session-created") || "0", 10) || 0;
    const authUser = req.headers.get("x-auth-user")?.trim().toLowerCase();

    // 0. Asynchronous Non-Blocking Visitor Telemetry (Does NOT block critical auth verification)
    (async () => {
      try {
        await supabase.rpc("record_site_visitor", {
          p_ip: clientIp,
          p_user_agent: userAgent,
          p_page: "/",
          p_country: clientCountry,
        });

        if (reqSessionId || authUser) {
          await supabase
            .from("site_visitors")
            .update({
              active_session_id: reqSessionId || null,
              username: authUser || null,
            })
            .eq("ip", clientIp);
        }
      } catch (e) {
        // Non-blocking fallback
      }
    })();

    // 1. Parallel High-Speed Security Verification: Run settings and IP lock queries concurrently
    const [allSettingsRes, lockRecordRes] = await Promise.all([
      supabase.from("system_security_settings").select("*").in("id", ["global", "vanish_mode"]),
      supabase.from("auth_ip_locks").select("*").eq("ip", clientIp).maybeSingle(),
    ]);

    const allSettings = allSettingsRes.data;
    const settings = allSettings?.find((s) => s.id === "global");
    const vanishSettings = allSettings?.find((s) => s.id === "vanish_mode");
    const isVanishMode = Boolean(vanishSettings?.ip_lockdown_enabled);

    // 1.1 Priority: Check Vanish Mode
    if (isVanishMode) {
      const isAllowed = Array.isArray(settings?.allowed_ips) && settings.allowed_ips.includes(clientIp);
      if (!isAllowed) {
        return NextResponse.json({
          ip: clientIp,
          locked: true,
          isVanishMode: true,
          vanishRedirectUrl: "https://www.wikipedia.org",
          attempts: 0,
          remainingAttempts: 0,
          lockedUntil: null,
          remainingMs: 0,
          error: "VANISH_MODE",
        });
      }
    }

    if (settings) {
      // 1.0 Evict Kicked Sessions
      if (settings.kick_sessions_before && authUser) {
        const kickBeforeMs = new Date(settings.kick_sessions_before).getTime();
        const isPreservedSession = Boolean(
          settings.active_session_id && settings.active_session_id === reqSessionId
        );

        if (!isPreservedSession && (reqSessionCreated < kickBeforeMs || !settings.active_session_id)) {
          return NextResponse.json({
            ip: clientIp,
            locked: true,
            sessionTerminated: true,
            attempts: 0,
            remainingAttempts: 0,
            lockedUntil: null,
            remainingMs: 0,
            error: "SESSION TERMINATED: Your session was logged out by the Chief Administrator from Master Control.",
          });
        }
      }

      if (Array.isArray(settings.blacklisted_ips) && settings.blacklisted_ips.includes(clientIp)) {
        return NextResponse.json({
          ip: clientIp,
          locked: true,
          attempts: 3,
          remainingAttempts: 0,
          lockedUntil: "2099-12-31T23:59:59Z",
          remainingMs: 999999999999,
          isBlacklisted: true,
        });
      }

      if (settings.ip_lockdown_enabled) {
        const isAllowed = Array.isArray(settings.allowed_ips) && settings.allowed_ips.includes(clientIp);
        if (!isAllowed) {
          return NextResponse.json({
            ip: clientIp,
            locked: true,
            attempts: 0,
            remainingAttempts: 0,
            lockedUntil: null,
            remainingMs: 0,
            isLockdown: true,
          });
        }
      }
    }

    const record = lockRecordRes.data;
    const error = lockRecordRes.error;

    if (error && error.code !== "PGRST116") {
      console.error("Lockout query error:", error);
    }

    if (record) {
      if (record.locked_until) {
        const lockedUntilMs = new Date(record.locked_until).getTime();
        const nowMs = Date.now();
        if (lockedUntilMs > nowMs) {
          const remainingMs = lockedUntilMs - nowMs;
          return NextResponse.json({
            ip: clientIp,
            locked: true,
            attempts: Math.max(record.failed_attempts || 3, 3),
            remainingAttempts: 0,
            lockedUntil: record.locked_until,
            remainingMs,
          });
        } else {
          // Lockout expired after 24h, auto reset
          await supabase
            .from("auth_ip_locks")
            .update({ failed_attempts: 0, locked_until: null })
            .eq("ip", clientIp);

          return NextResponse.json({
            ip: clientIp,
            locked: false,
            attempts: 0,
            remainingAttempts: 3,
            lockedUntil: null,
            remainingMs: 0,
          });
        }
      }

      return NextResponse.json({
        ip: clientIp,
        locked: false,
        attempts: record.failed_attempts || 0,
        remainingAttempts: Math.max(0, 3 - (record.failed_attempts || 0)),
        lockedUntil: null,
        remainingMs: 0,
      });
    }

    return NextResponse.json({
      ip: clientIp,
      locked: false,
      attempts: 0,
      remainingAttempts: 3,
      lockedUntil: null,
      remainingMs: 0,
    });
  } catch (err: any) {
    console.error("Failed to check lockout status:", err);
    return NextResponse.json({ ip: clientIp, locked: false, attempts: 0, remainingAttempts: 3 });
  }
}
