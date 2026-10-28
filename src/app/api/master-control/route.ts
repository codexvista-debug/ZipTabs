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

// GET: Fetch system settings, users, IP locks, and current client IP
export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Database offline" },
      { status: 503 }
    );
  }

  try {
    const [settingsRes, usersRes, ipLocksRes] = await Promise.all([
      supabase
        .from("system_security_settings")
        .select("*")
        .eq("id", "global")
        .maybeSingle(),
      supabase
        .from("app_users")
        .select("id, username, role, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("auth_ip_locks")
        .select("*")
        .order("last_attempt_at", { ascending: false }),
    ]);

    const settings = settingsRes.data || {
      id: "global",
      registrations_allowed: false,
      ip_lockdown_enabled: false,
      allowed_ips: [],
      blacklisted_ips: [],
    };

    return NextResponse.json({
      success: true,
      clientIp,
      settings,
      users: usersRes.data || [],
      ipLocks: ipLocksRes.data || [],
    });
  } catch (err: any) {
    console.error("Master Control GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Execute security mutations
export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Fetch current settings
    const { data: currentSettings } = await supabase
      .from("system_security_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    const allowedIps: string[] = currentSettings?.allowed_ips || [];
    const blacklistedIps: string[] = currentSettings?.blacklisted_ips || [];

    if (action === "toggle_registrations") {
      const allowed = Boolean(body.allowed);
      await supabase
        .from("system_security_settings")
        .upsert({
          id: "global",
          registrations_allowed: allowed,
          updated_at: new Date().toISOString(),
          updated_by: "chief",
        });
      return NextResponse.json({ success: true, registrations_allowed: allowed });
    }

    if (action === "toggle_lockdown") {
      const enabled = Boolean(body.enabled);
      let updatedAllowed = [...allowedIps];
      // If enabling lockdown and current IP isn't allowed, auto-whitelist current IP
      if (enabled && clientIp && !updatedAllowed.includes(clientIp)) {
        updatedAllowed.push(clientIp);
      }

      await supabase
        .from("system_security_settings")
        .upsert({
          id: "global",
          ip_lockdown_enabled: enabled,
          allowed_ips: updatedAllowed,
          updated_at: new Date().toISOString(),
          updated_by: "chief",
        });
      return NextResponse.json({
        success: true,
        ip_lockdown_enabled: enabled,
        allowed_ips: updatedAllowed,
      });
    }

    if (action === "add_allowed_ip") {
      const ip = (body.ip || "").trim();
      if (!ip) return NextResponse.json({ success: false, error: "IP required" }, { status: 400 });
      const updated = Array.from(new Set([...allowedIps, ip]));
      await supabase
        .from("system_security_settings")
        .upsert({
          id: "global",
          allowed_ips: updated,
          updated_at: new Date().toISOString(),
        });
      return NextResponse.json({ success: true, allowed_ips: updated });
    }

    if (action === "remove_allowed_ip") {
      const ip = (body.ip || "").trim();
      const updated = allowedIps.filter((item) => item !== ip);
      await supabase
        .from("system_security_settings")
        .upsert({
          id: "global",
          allowed_ips: updated,
          updated_at: new Date().toISOString(),
        });
      return NextResponse.json({ success: true, allowed_ips: updated });
    }

    if (action === "blacklist_ip") {
      const ip = (body.ip || "").trim();
      if (!ip) return NextResponse.json({ success: false, error: "IP required" }, { status: 400 });
      const updated = Array.from(new Set([...blacklistedIps, ip]));

      // 1. Update system settings
      await supabase
        .from("system_security_settings")
        .upsert({
          id: "global",
          blacklisted_ips: updated,
          updated_at: new Date().toISOString(),
        });

      // 2. Lock in auth_ip_locks with 10-year expiration
      await supabase.from("auth_ip_locks").upsert({
        ip,
        failed_attempts: 3,
        locked_until: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        last_attempt_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, blacklisted_ips: updated });
    }

    if (action === "unblacklist_ip") {
      const ip = (body.ip || "").trim();
      const updated = blacklistedIps.filter((item) => item !== ip);

      await supabase
        .from("system_security_settings")
        .upsert({
          id: "global",
          blacklisted_ips: updated,
          updated_at: new Date().toISOString(),
        });

      // Reset strikes in auth_ip_locks
      await supabase
        .from("auth_ip_locks")
        .update({
          failed_attempts: 0,
          locked_until: null,
        })
        .eq("ip", ip);

      return NextResponse.json({ success: true, blacklisted_ips: updated });
    }

    if (action === "reset_strikes") {
      const ip = (body.ip || "").trim();
      await supabase
        .from("auth_ip_locks")
        .update({
          failed_attempts: 0,
          locked_until: null,
        })
        .eq("ip", ip);

      return NextResponse.json({ success: true });
    }

    if (action === "delete_user") {
      const userId = body.userId;
      // Safeguard: Never delete chief!
      const { data: userToDelete } = await supabase
        .from("app_users")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      if (userToDelete?.username?.toLowerCase() === "chief") {
        return NextResponse.json(
          { success: false, error: "The Chief Administrator account cannot be deleted." },
          { status: 400 }
        );
      }

      await supabase.from("app_users").delete().eq("id", userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Master Control POST error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
