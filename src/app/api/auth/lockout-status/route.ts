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

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);

  if (!supabase) {
    return NextResponse.json({ ip: clientIp, attempts: 0, remainingAttempts: 3, locked: false });
  }

  try {
    // 0. Check Master Control Security Settings
    const { data: settings } = await supabase
      .from("system_security_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    if (settings) {
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

    const { data: record, error } = await supabase
      .from("auth_ip_locks")
      .select("*")
      .eq("ip", clientIp)
      .maybeSingle();

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
