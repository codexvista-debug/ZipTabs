import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const REQUIRED_PIN = process.env.DISCORD_CONTROL_PIN || "7416";

function extractClientIp(req: NextRequest): string {
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

/**
 * Sends a rich audit embed to your Discord Channel via incoming webhook if configured.
 */
async function notifyDiscordChannel(embed: {
  title: string;
  description: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "ZipTabs Security Sentinel",
        avatar_url: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.png",
        embeds: [
          {
            ...embed,
            footer: { text: "ZipTabs Remote Controller • Webhook Gateway" },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    console.error("[Discord Webhook] Failed to deliver notification:", err);
  }
}

// GET: Quick-action browser link (e.g. /api/webhook/control?pin=7416&action=vanish_off)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pin = searchParams.get("pin") || "";
  const action = (searchParams.get("action") || "status").toLowerCase();
  const clientIp = extractClientIp(req);

  return handleControlAction({ pin, action, ip: searchParams.get("ip") || clientIp, clientIp });
}

// POST: Standard JSON Webhook endpoint
export async function POST(req: NextRequest) {
  const clientIp = extractClientIp(req);
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const pin = String(body.pin || "").trim();
  const action = String(body.action || "").toLowerCase().trim();
  const targetIp = String(body.ip || clientIp).trim();

  return handleControlAction({ pin, action, ip: targetIp, clientIp });
}

async function handleControlAction({
  pin,
  action,
  ip,
  clientIp,
}: {
  pin: string;
  action: string;
  ip: string;
  clientIp: string;
}) {
  // 1. PIN Security Validation
  if (pin !== REQUIRED_PIN) {
    await notifyDiscordChannel({
      title: "🚨 Unauthorized Remote Access Attempt",
      description: "A request was sent to the Remote Webhook Control Gateway with an incorrect PIN.",
      color: 0xe11d48,
      fields: [
        { name: "Attempted Action", value: `\`${action}\``, inline: true },
        { name: "Source IP", value: `\`${clientIp}\``, inline: true },
      ],
    });

    return NextResponse.json(
      {
        success: false,
        error: "Access Denied. Invalid Security PIN.",
      },
      { status: 401 }
    );
  }

  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    // 2. Action: Vanish Mode ON
    if (action === "vanish_on" || action === "vanish_enable") {
      await supabase.from("system_security_settings").upsert({
        id: "vanish_mode",
        ip_lockdown_enabled: true,
        updated_at: new Date().toISOString(),
        updated_by: "webhook:remote",
      });

      await notifyDiscordChannel({
        title: "🛡️ Vanish Mode ACTIVATED",
        description:
          "Wikipedia cloaking is now active across ZipTabs. All non-whitelisted IPs will be redirected to Wikipedia.",
        color: 0x2563eb,
        fields: [
          { name: "Status", value: "🔒 ACTIVE", inline: true },
          { name: "Triggered via", value: "Remote Webhook", inline: true },
          { name: "PIN Verification", value: "✅ PIN 7416 Verified", inline: true },
        ],
      });

      return NextResponse.json({
        success: true,
        vanish_mode: true,
        message: "Vanish Mode is now ACTIVE (Redirecting unauthorized traffic to Wikipedia).",
      });
    }

    // 3. Action: Vanish Mode OFF
    if (action === "vanish_off" || action === "vanish_disable") {
      await supabase.from("system_security_settings").upsert({
        id: "vanish_mode",
        ip_lockdown_enabled: false,
        updated_at: new Date().toISOString(),
        updated_by: "webhook:remote",
      });

      await notifyDiscordChannel({
        title: "🟢 Vanish Mode DEACTIVATED",
        description: "Vanish Mode has been turned off. Normal site access is restored.",
        color: 0x10b981,
        fields: [
          { name: "Status", value: "🔓 DISABLED", inline: true },
          { name: "Triggered via", value: "Remote Webhook", inline: true },
          { name: "PIN Verification", value: "✅ PIN 7416 Verified", inline: true },
        ],
      });

      return NextResponse.json({
        success: true,
        vanish_mode: false,
        message: "Vanish Mode has been DEACTIVATED. Normal access restored.",
      });
    }

    // 4. Action: Whitelist Caller IP
    if (action === "whitelist_ip" || action === "unlock") {
      const targetIp = ip || clientIp;

      const { data: currentGlobal } = await supabase
        .from("system_security_settings")
        .select("allowed_ips")
        .eq("id", "global")
        .maybeSingle();

      const currentAllowed: string[] = Array.isArray(currentGlobal?.allowed_ips)
        ? currentGlobal.allowed_ips
        : [];

      if (!currentAllowed.includes(targetIp)) {
        const updated = [...currentAllowed, targetIp];
        await supabase.from("system_security_settings").upsert({
          id: "global",
          allowed_ips: updated,
          updated_at: new Date().toISOString(),
          updated_by: "webhook:remote",
        });
      }

      await notifyDiscordChannel({
        title: "🌐 IP Whitelisted",
        description: `IP \`${targetIp}\` has been whitelisted for ZipTabs.`,
        color: 0x10b981,
        fields: [
          { name: "IP Address", value: `\`${targetIp}\``, inline: true },
          { name: "PIN Verification", value: "✅ PIN 7416 Verified", inline: true },
        ],
      });

      return NextResponse.json({
        success: true,
        whitelisted_ip: targetIp,
        message: `IP ${targetIp} has been whitelisted successfully.`,
      });
    }

    // 5. Action: Status
    const [vanishRes, globalRes] = await Promise.all([
      supabase.from("system_security_settings").select("*").eq("id", "vanish_mode").maybeSingle(),
      supabase.from("system_security_settings").select("*").eq("id", "global").maybeSingle(),
    ]);

    const isVanish = Boolean(vanishRes.data?.ip_lockdown_enabled);
    const allowedIps: string[] = Array.isArray(globalRes.data?.allowed_ips)
      ? globalRes.data.allowed_ips
      : [];

    return NextResponse.json({
      success: true,
      vanish_mode_enabled: isVanish,
      allowed_ips: allowedIps,
      caller_ip: clientIp,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
