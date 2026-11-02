import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

const REQUIRED_PIN = process.env.DISCORD_CONTROL_PIN || "7416";
const DISCORD_PUBLIC_KEY =
  process.env.DISCORD_PUBLIC_KEY ||
  "248d01d8cb8c15e8515032863b14b1eaa3faf6c2a0d3eb20ab9ca3a1808fb832";

// Discord Interaction Types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
};

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
};

/**
 * Validates Ed25519 signature sent by Discord for slash command security.
 */
function verifyDiscordSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string
): boolean {
  if (!signature || !timestamp || !publicKey) return false;
  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"), // ASN.1 DER prefix for ed25519
        Buffer.from(publicKey, "hex"),
      ]),
      format: "der",
      type: "spki",
    });

    return crypto.verify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signature, "hex")
    );
  } catch (err) {
    console.error("[Discord Auth] Signature verification error:", err);
    return false;
  }
}

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

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  // Enforce cryptographic signature verification using Discord application public key
  const isValid = verifyDiscordSignature(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
  if (!isValid) {
    return new NextResponse("Invalid request signature", { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1. Handle Discord PING challenge
  if (body.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  // 2. Handle Application Slash Commands
  if (body.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = body.data?.name?.toLowerCase();
    const optionsArray: any[] = body.data?.options || [];
    const options: Record<string, any> = {};

    for (const opt of optionsArray) {
      options[opt.name] = opt.value;
    }

    const providedPin = String(options.pin || "").trim();
    const callerUser = body.member?.user?.username || body.user?.username || "Discord User";
    const clientIp = extractClientIp(req);

    // --- SECURITY PIN ENFORCEMENT ---
    if (providedPin !== REQUIRED_PIN) {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 64, // Ephemeral (only visible to caller)
          embeds: [
            {
              title: "🚫 Access Denied: Invalid Security PIN",
              description: `The command \`/${commandName}\` was rejected because the security PIN is incorrect.`,
              color: 0xe11d48, // Rose red
              fields: [
                { name: "Caller", value: `@${callerUser}`, inline: true },
                { name: "Status", value: "Action Blocked", inline: true },
              ],
              footer: { text: "ZipTabs Defense Grid • PIN Required for Remote Commands" },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    }

    if (!supabase) {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 64,
          content: "⚠️ Database service offline. Could not contact Supabase.",
        },
      });
    }

    // --- COMMAND: /vanish ---
    if (commandName === "vanish") {
      const state = String(options.state || "").toLowerCase().trim(); // "on", "off", "status"

      try {
        if (state === "on" || state === "enable" || state === "activate") {
          // Turn Vanish Mode ON
          await supabase.from("system_security_settings").upsert({
            id: "vanish_mode",
            ip_lockdown_enabled: true,
            updated_at: new Date().toISOString(),
            updated_by: `discord:@${callerUser}`,
          });

          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [
                {
                  title: "🛡️ Vanish Mode ACTIVATED",
                  description:
                    "**Wikipedia Cloaking is now ACTIVE on ZipTabs.**\nAll traffic outside of whitelisted IPs will be instantly evicted and redirected to Wikipedia with zero assets served.",
                  color: 0x2563eb, // Cobalt Blue
                  fields: [
                    { name: "State", value: "🔒 ON (Cloaked)", inline: true },
                    { name: "Authorized By", value: `@${callerUser}`, inline: true },
                    { name: "PIN Verification", value: "✅ PIN 7416 Verified", inline: true },
                  ],
                  footer: { text: "ZipTabs Remote Controller • Command Executed" },
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          });
        } else if (state === "off" || state === "disable" || state === "deactivate") {
          // Turn Vanish Mode OFF
          await supabase.from("system_security_settings").upsert({
            id: "vanish_mode",
            ip_lockdown_enabled: false,
            updated_at: new Date().toISOString(),
            updated_by: `discord:@${callerUser}`,
          });

          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [
                {
                  title: "🟢 Vanish Mode DEACTIVATED",
                  description:
                    "**Vanish Mode is now DISABLED.**\nZipTabs is accessible normally from any network without Wikipedia redirection.",
                  color: 0x10b981, // Emerald Green
                  fields: [
                    { name: "State", value: "🔓 OFF (Open)", inline: true },
                    { name: "Authorized By", value: `@${callerUser}`, inline: true },
                    { name: "PIN Verification", value: "✅ PIN 7416 Verified", inline: true },
                  ],
                  footer: { text: "ZipTabs Remote Controller • Command Executed" },
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          });
        } else {
          // Check Status
          const { data: vanishData } = await supabase
            .from("system_security_settings")
            .select("ip_lockdown_enabled, updated_at, updated_by")
            .eq("id", "vanish_mode")
            .maybeSingle();

          const { data: globalData } = await supabase
            .from("system_security_settings")
            .select("allowed_ips")
            .eq("id", "global")
            .maybeSingle();

          const isEnabled = Boolean(vanishData?.ip_lockdown_enabled);
          const allowedCount = Array.isArray(globalData?.allowed_ips)
            ? globalData.allowed_ips.length
            : 0;

          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [
                {
                  title: "📊 ZipTabs Defense Status",
                  color: isEnabled ? 0x2563eb : 0x10b981,
                  fields: [
                    {
                      name: "Vanish Mode",
                      value: isEnabled ? "🔒 **ACTIVE** (Wikipedia Redirect)" : "🟢 **INACTIVE** (Open Access)",
                      inline: true,
                    },
                    {
                      name: "Whitelisted IPs",
                      value: `${allowedCount} allowed IP${allowedCount === 1 ? "" : "s"}`,
                      inline: true,
                    },
                    {
                      name: "Last Modified",
                      value: vanishData?.updated_at
                        ? new Date(vanishData.updated_at).toLocaleString()
                        : "Unknown",
                      inline: false,
                    },
                  ],
                  footer: { text: "ZipTabs Remote Controller • Status Query" },
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: 64,
            content: `❌ Error toggling Vanish Mode: ${err?.message || "Unknown error"}`,
          },
        });
      }
    }

    // --- COMMAND: /whitelist ---
    if (commandName === "whitelist") {
      const targetIp = String(options.ip || "").trim();

      if (!targetIp) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: 64,
            content: "⚠️ Please specify an IP address to whitelist (e.g. `/whitelist ip:49.43.232.217 pin:7416`).",
          },
        });
      }

      try {
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
            updated_by: `discord:@${callerUser}`,
          });
        }

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [
              {
                title: "✅ IP Whitelisted Successfully",
                description: `IP \`${targetIp}\` has been authorized to access ZipTabs even while Vanish Mode is active.`,
                color: 0x10b981,
                fields: [
                  { name: "Whitelisted IP", value: `\`${targetIp}\``, inline: true },
                  { name: "Authorized By", value: `@${callerUser}`, inline: true },
                ],
                footer: { text: "ZipTabs Remote Controller • Access Granted" },
                timestamp: new Date().toISOString(),
              },
            ],
          },
        });
      } catch (err: any) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: 64,
            content: `❌ Failed to whitelist IP: ${err?.message}`,
          },
        });
      }
    }

    // --- COMMAND: /status ---
    if (commandName === "status") {
      try {
        const [vanishRes, globalRes, invRes, notesRes] = await Promise.all([
          supabase.from("system_security_settings").select("*").eq("id", "vanish_mode").maybeSingle(),
          supabase.from("system_security_settings").select("*").eq("id", "global").maybeSingle(),
          supabase.from("invoices").select("amount, days_overdue"),
          supabase.from("app_notes").select("id, priority, is_completed"),
        ]);

        const isVanish = Boolean(vanishRes.data?.ip_lockdown_enabled);
        const allowedCount = Array.isArray(globalRes.data?.allowed_ips) ? globalRes.data.allowed_ips.length : 0;
        const totalInvoices = invRes.data?.length || 0;
        const totalOverdueAmount = (invRes.data || []).reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
        const urgentNotes = (notesRes.data || []).filter((n: any) => !n.is_completed && n.priority === "urgent").length;

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [
              {
                title: "⚡ ZipTabs Executive Briefing",
                color: 0x2563eb,
                fields: [
                  {
                    name: "🛡️ Vanish Mode",
                    value: isVanish ? "🔒 ACTIVE" : "🟢 DISABLED",
                    inline: true,
                  },
                  {
                    name: "🌐 Whitelisted IPs",
                    value: `${allowedCount} active`,
                    inline: true,
                  },
                  {
                    name: "📑 Overdue Invoices",
                    value: `${totalInvoices} records ($${totalOverdueAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })})`,
                    inline: false,
                  },
                  {
                    name: "🔥 Urgent Notes",
                    value: `${urgentNotes} pending task${urgentNotes === 1 ? "" : "s"}`,
                    inline: true,
                  },
                ],
                footer: { text: "ZipTabs System Health • Requested by Chief" },
                timestamp: new Date().toISOString(),
              },
            ],
          },
        });
      } catch (err: any) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { flags: 64, content: `❌ Error reading status: ${err?.message}` },
        });
      }
    }

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: 64,
        content: `❓ Unknown command: \`/${commandName}\`.`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported interaction" }, { status: 400 });
}
