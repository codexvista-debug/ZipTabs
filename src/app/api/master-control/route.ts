import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/crypto";
import { getSessionUser } from "@/lib/session";
import { getClientIp } from "@/lib/serverIp";
import { getAiApiKey } from "@/lib/aiVault";



// GET: Fetch system settings, users, IP locks, and current client IP
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.username.toLowerCase() !== "chief" && session.role !== "Chief Administrator") {
    return NextResponse.json(
      { success: false, error: "Forbidden: Master Control requires @chief authorization." },
      { status: 403 }
    );
  }

  const clientIp = getClientIp(req);
  const db = supabaseAdmin || supabase;

  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database offline" },
      { status: 503 }
    );
  }

  try {
    const [settingsRes, vanishRes, usersRes, ipLocksRes, visitorsRes] = await Promise.all([
      db
        .from("system_security_settings")
        .select("*")
        .eq("id", "global")
        .maybeSingle(),
      db
        .from("system_security_settings")
        .select("*")
        .eq("id", "vanish_mode")
        .maybeSingle(),
      db
        .from("app_users")
        .select("id, username, role, created_at")
        .order("created_at", { ascending: true }),
      db
        .from("auth_ip_locks")
        .select("*")
        .order("last_attempt_at", { ascending: false }),
      db
        .from("site_visitors")
        .select("*")
        .order("last_visited_at", { ascending: false })
        .limit(100),
    ]);

    const isLockdown = Boolean(
      settingsRes.data?.ip_lockdown_enabled || vanishRes.data?.ip_lockdown_enabled
    );

    const globalData = settingsRes.data || {
      id: "global",
      registrations_allowed: false,
      ip_lockdown_enabled: false,
      allowed_ips: [],
      blacklisted_ips: [],
    };

    const settings = {
      ...globalData,
      ip_lockdown_enabled: isLockdown,
      vanish_mode_enabled: isLockdown,
    };

    const groqKey = (await getAiApiKey("groq")) || "";
    const geminiKey = (await getAiApiKey("gemini")) || "";

    const maskKey = (key: string) => {
      if (!key) return "Not Configured";
      if (key.length <= 8) return "••••••••";
      return `${key.substring(0, 4)}••••••••••••${key.slice(-4)}`;
    };

    const getHash = (key: string) => {
      if (!key) return "None";
      try {
        return "sha256:" + crypto.createHash("sha256").update(key + ":ziptabs_vault_kdf_salt_9e31d8f_2026").digest("hex").substring(0, 16);
      } catch {
        return "sha256:active";
      }
    };

    const aiEngines = [
      {
        id: "groq",
        name: "Groq Cloud LPU Engine",
        provider: "Groq, Inc.",
        model: "qwen/qwen3.8-27b",
        status: groqKey ? "active" : "offline",
        maskedKey: maskKey(groqKey),
        hashSignature: getHash(groqKey),
        type: "Ultra-Fast LPU Text & Component Generation (<200ms)",
        tier: "Free Tier (Unlimited LPU Inferences)",
        vaultStatus: "AES-256-GCM Encrypted in Supabase Vault",
      },
      {
        id: "gemini",
        name: "Google Gemini 2.5",
        provider: "Google AI Studio",
        model: "gemini-2.5-flash",
        status: geminiKey ? "active" : "offline",
        maskedKey: maskKey(geminiKey),
        hashSignature: getHash(geminiKey),
        type: "Multimodal Vision, PDF OCR & 1M-Token Context",
        tier: "Free Tier (15 RPM / 1,500 req/day)",
        vaultStatus: "AES-256-GCM Encrypted in Supabase Vault",
      },
    ];

    return NextResponse.json(
      {
        success: true,
        clientIp,
        settings,
        aiEngines,
        users: usersRes.data || [],
        ipLocks: ipLocksRes.data || [],
        visitors: visitorsRes.data || [],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    console.error("Master Control GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Execute security mutations
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.username.toLowerCase() !== "chief" && session.role !== "Chief Administrator") {
    return NextResponse.json(
      { success: false, error: "Forbidden: Master Control requires @chief authorization." },
      { status: 403 }
    );
  }

  const clientIp = getClientIp(req);
  const db = supabaseAdmin || supabase;

  if (!db) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Fetch current settings
    const { data: currentSettings } = await db
      .from("system_security_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    const allowedIps: string[] = currentSettings?.allowed_ips || [];
    const blacklistedIps: string[] = currentSettings?.blacklisted_ips || [];

    if (action === "toggle_registrations") {
      const allowed = Boolean(body.allowed);
      await db
        .from("system_security_settings")
        .upsert({
          id: "global",
          registrations_allowed: allowed,
          updated_at: new Date().toISOString(),
          updated_by: "chief",
        });
      return NextResponse.json({ success: true, registrations_allowed: allowed });
    }

    if (action === "toggle_lockdown" || action === "toggle_vanish_mode") {
      const enabled = Boolean(body.enabled);
      let updatedAllowed = [...allowedIps];
      // If enabling lockdown and current IP isn't allowed, auto-whitelist current IP so Chief is never ejected
      if (enabled && clientIp && !updatedAllowed.includes(clientIp)) {
        updatedAllowed.push(clientIp);
      }

      // Synchronize both global and vanish_mode as one unified Lockdown system
      await Promise.all([
        db
          .from("system_security_settings")
          .upsert({
            id: "global",
            ip_lockdown_enabled: enabled,
            allowed_ips: updatedAllowed,
            updated_at: new Date().toISOString(),
            updated_by: "chief",
          }),
        db
          .from("system_security_settings")
          .upsert({
            id: "vanish_mode",
            ip_lockdown_enabled: enabled,
            updated_at: new Date().toISOString(),
            updated_by: "chief",
          }),
      ]);

      return NextResponse.json({
        success: true,
        ip_lockdown_enabled: enabled,
        vanish_mode_enabled: enabled,
        allowed_ips: updatedAllowed,
      });
    }

    if (action === "add_allowed_ip") {
      const ip = (body.ip || "").trim();
      if (!ip) return NextResponse.json({ success: false, error: "IP required" }, { status: 400 });
      const updated = Array.from(new Set([...allowedIps, ip]));
      await db
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
      await db
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
      await db
        .from("system_security_settings")
        .upsert({
          id: "global",
          blacklisted_ips: updated,
          updated_at: new Date().toISOString(),
        });

      // 2. Lock in auth_ip_locks with 10-year expiration
      await db.from("auth_ip_locks").upsert({
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

      await db
        .from("system_security_settings")
        .upsert({
          id: "global",
          blacklisted_ips: updated,
          updated_at: new Date().toISOString(),
        });

      // Reset strikes in auth_ip_locks
      await db
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
      await db
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
      const { data: userToDelete } = await db
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

      await db.from("app_users").delete().eq("id", userId);
      return NextResponse.json({ success: true });
    }

    if (action === "kick_other_sessions") {
      const keepSessionId = (body.keepSessionId || "").trim();
      const now = new Date().toISOString();

      await db
        .from("system_security_settings")
        .upsert({
          id: "global",
          kick_sessions_before: now,
          active_session_id: keepSessionId,
          updated_at: now,
          updated_by: "chief",
        });

      return NextResponse.json({
        success: true,
        message: "All other active sessions have been evicted and logged out.",
        activeSessionId: keepSessionId,
        kickedAt: now,
      });
    }

    if (action === "clear_logs") {
      const password = (body.password || "").trim();
      const target = body.target || "all"; // "defense" | "visitors" | "all"

      if (!password) {
        return NextResponse.json(
          { success: false, error: "Chief administrator password is required to clear logs." },
          { status: 400 }
        );
      }

      // 1. Verify Chief password
      const { data: chiefUser } = await db
        .from("app_users")
        .select("password")
        .ilike("username", "chief")
        .maybeSingle();

      if (!chiefUser) {
        return NextResponse.json(
          { success: false, error: "Chief administrator account not found." },
          { status: 404 }
        );
      }

      const isMatch = await verifyPassword(password, chiefUser.password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: "Incorrect password. Clearing logs rejected." },
          { status: 403 }
        );
      }

      // 2. Perform authorized log deletion
      if (target === "defense" || target === "all") {
        await db.from("auth_ip_locks").delete().neq("ip", "");
      }
      if (target === "visitors" || target === "all") {
        await db.from("site_visitors").delete().neq("ip", "");
      }

      return NextResponse.json({
        success: true,
        message:
          target === "all"
            ? "All IP attack defense and live visitor records cleared."
            : target === "defense"
            ? "IP Traffic & Attack Defense records cleared."
            : "Live website visitor traffic logs cleared.",
      });
    }

    if (action === "test_ai_engine") {
      const engine = body.engine;
      const start = Date.now();

      if (engine === "groq") {
        const key = await getAiApiKey("groq");
        if (!key) {
          return NextResponse.json({ success: false, error: "Groq API key not configured on server or vault" }, { status: 400 });
        }
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            messages: [{ role: "user", content: "ZipTabs Master Control beacon test. Return 1 short confirmation sentence stating Groq is active." }],
            max_tokens: 35,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return NextResponse.json({ success: false, error: errData?.error?.message || `Groq returned HTTP ${res.status}` }, { status: 502 });
        }
        const data = await res.json();
        const latency = Date.now() - start;
        const reply = data.choices?.[0]?.message?.content?.trim() || "Groq active.";
        return NextResponse.json({
          success: true,
          latencyMs: latency,
          reply,
          model: "qwen/qwen3.8-27b",
          provider: "Groq Cloud LPU",
        });
      }

      if (engine === "gemini") {
        const key = await getAiApiKey("gemini");
        if (!key) {
          return NextResponse.json({ success: false, error: "Gemini API key not configured on server or vault" }, { status: 400 });
        }
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ZipTabs Master Control beacon test. Return 1 short confirmation sentence stating Gemini is active." }] }],
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return NextResponse.json({ success: false, error: errData?.error?.message || `Gemini returned HTTP ${res.status}` }, { status: 502 });
        }
        const data = await res.json();
        const latency = Date.now() - start;
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Gemini active.";
        return NextResponse.json({
          success: true,
          latencyMs: latency,
          reply,
          model: "gemini-2.5-flash",
          provider: "Google AI Studio",
        });
      }

      return NextResponse.json({ success: false, error: "Unknown engine" }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Master Control POST error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
