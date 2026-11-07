import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { extractClientIp } from "@/lib/serverIp";

const REQUIRED_PIN = process.env.DISCORD_CONTROL_PIN?.trim() || "";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || "";

// Discord Interaction Types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
};

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
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

/**
 * Constant-time comparison to prevent timing-attack side channels when verifying security PIN.
 */
function isConstantTimePinValid(providedPin: string, expectedPin: string): boolean {
  if (!expectedPin || !providedPin) return false;
  const provHash = crypto.createHash("sha256").update(providedPin).digest();
  const expHash = crypto.createHash("sha256").update(expectedPin).digest();
  return crypto.timingSafeEqual(provHash, expHash);
}

function sendPinDeniedResponse(commandName: string, callerUser: string) {
  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: 64, // Ephemeral (strictly visible to caller)
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

async function handleLockdownAction(state: string, callerUser: string, clientIp?: string) {
  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: "⚠️ Database service offline. Could not contact Supabase." },
    });
  }

  const actorTag = clientIp ? `discord:@${callerUser} [${clientIp}]` : `discord:@${callerUser}`;

  try {
    if (state === "on" || state === "enable" || state === "activate") {
      // Turn Lockdown ON (Synchronize both global and vanish_mode)
      await Promise.all([
        db.from("system_security_settings").upsert({
          id: "global",
          ip_lockdown_enabled: true,
          updated_at: new Date().toISOString(),
          updated_by: actorTag,
        }),
        db.from("system_security_settings").upsert({
          id: "vanish_mode",
          ip_lockdown_enabled: true,
          updated_at: new Date().toISOString(),
          updated_by: actorTag,
        }),
      ]);

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: "🛡️ ZipTabs Lockdown ACTIVATED",
              description:
                "**Lockdown Mode is now ACTIVE on ZipTabs.**\nAccess is strictly restricted to whitelisted IPs. All unauthorized traffic will be evicted and cloaked (redirected to Wikipedia) with zero assets served.",
              color: 0xe11d48, // Crimson Red
              fields: [
                { name: "Lockdown State", value: "🔒 ON (Restricted & Cloaked)", inline: true },
                { name: "Authorized By", value: `@${callerUser}`, inline: true },
                { name: "PIN Verification", value: "✅ Authorized (Chief PIN)", inline: true },
              ],
              footer: { text: "ZipTabs Defense Grid • Remote Lockdown Active" },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    } else if (state === "off" || state === "disable" || state === "deactivate") {
      // Turn Lockdown OFF (Synchronize both global and vanish_mode)
      await Promise.all([
        db.from("system_security_settings").upsert({
          id: "global",
          ip_lockdown_enabled: false,
          updated_at: new Date().toISOString(),
          updated_by: actorTag,
        }),
        db.from("system_security_settings").upsert({
          id: "vanish_mode",
          ip_lockdown_enabled: false,
          updated_at: new Date().toISOString(),
          updated_by: actorTag,
        }),
      ]);

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: "🟢 ZipTabs Lockdown DEACTIVATED",
              description:
                "**Lockdown Mode is now DISABLED.**\nZipTabs is accessible normally from any network without IP restriction or Wikipedia redirection.",
              color: 0x10b981, // Emerald Green
              fields: [
                { name: "Lockdown State", value: "🔓 OFF (Open Access)", inline: true },
                { name: "Authorized By", value: `@${callerUser}`, inline: true },
                { name: "PIN Verification", value: "✅ Authorized (Chief PIN)", inline: true },
              ],
              footer: { text: "ZipTabs Defense Grid • Normal Access Restored" },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    } else {
      // Check Status
      const [vanishDataRes, globalDataRes] = await Promise.all([
        db
          .from("system_security_settings")
          .select("ip_lockdown_enabled, updated_at, updated_by")
          .eq("id", "vanish_mode")
          .maybeSingle(),
        db
          .from("system_security_settings")
          .select("ip_lockdown_enabled, allowed_ips, updated_at, updated_by")
          .eq("id", "global")
          .maybeSingle(),
      ]);

      const isEnabled = Boolean(
        globalDataRes.data?.ip_lockdown_enabled || vanishDataRes.data?.ip_lockdown_enabled
      );
      const allowedCount = Array.isArray(globalDataRes.data?.allowed_ips)
        ? globalDataRes.data.allowed_ips.length
        : 0;

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: "📊 ZipTabs Defense Status",
              color: isEnabled ? 0xe11d48 : 0x10b981,
              fields: [
                {
                  name: "Lockdown Mode",
                  value: isEnabled ? "🔒 **ACTIVE** (Locked & Cloaked to Wikipedia)" : "🟢 **INACTIVE** (Open Access)",
                  inline: true,
                },
                {
                  name: "Whitelisted IPs",
                  value: `${allowedCount} allowed IP${allowedCount === 1 ? "" : "s"}`,
                  inline: true,
                },
                {
                  name: "Last Modified",
                  value: (globalDataRes.data?.updated_at || vanishDataRes.data?.updated_at)
                    ? new Date((globalDataRes.data?.updated_at || vanishDataRes.data?.updated_at)!).toLocaleString()
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
        content: `❌ Error toggling Lockdown Mode: ${err?.message || "Unknown error"}`,
      },
    });
  }
}

async function handleStatusQuery() {
  const db = supabaseAdmin || supabase;
  if (!db) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: "⚠️ Database service offline. Could not contact Supabase." },
    });
  }

  try {
    const [vanishRes, globalRes, invRes, notesRes] = await Promise.all([
      db.from("system_security_settings").select("*").eq("id", "vanish_mode").maybeSingle(),
      db.from("system_security_settings").select("*").eq("id", "global").maybeSingle(),
      db.from("invoices").select("amount, days_overdue"),
      db.from("app_notes").select("id, priority, is_completed"),
    ]);

    const isLockdown = Boolean(globalRes.data?.ip_lockdown_enabled || vanishRes.data?.ip_lockdown_enabled);
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
            color: isLockdown ? 0xe11d48 : 0x2563eb,
            fields: [
              {
                name: "🛡️ Lockdown Mode",
                value: isLockdown ? "🔒 ACTIVE (Locked)" : "🟢 DISABLED (Open)",
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

async function handleClearChannel(channelId: string, target: string, callerUser: string) {
  if (!channelId) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: 64,
        content: "❌ Unable to identify channel ID for purge.",
      },
    });
  }

  const token = DISCORD_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: 64,
        content: "❌ Discord Bot Token is not configured.",
      },
    });
  }

  const isAll = target === "all" || !target;
  let remainingToFetch = isAll ? 100 : Math.min(parseInt(target, 10) || 100, 100);
  let totalDeleted = 0;
  let lackedManagePermission = false;

  try {
    // Fetch messages from channel
    const fetchRes = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=${remainingToFetch}`,
      {
        headers: {
          Authorization: `Bot ${token}`,
        },
      }
    );

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 64,
          content: `❌ Failed to fetch channel messages (${fetchRes.status}): ${errText}`,
        },
      });
    }

    const messages: Array<{ id: string; author?: { id: string; username?: string }; timestamp: string }> =
      await fetchRes.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 64,
          embeds: [
            {
              title: "🧹 Channel Clean",
              description: "There are no messages in this channel to clear.",
              color: 0x10b981,
              footer: { text: "ZipTabs Defense Grid • Channel Maintenance" },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    }

    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recentMessages = messages.filter(
      (m) => new Date(m.timestamp).getTime() > fourteenDaysAgo
    );
    const recentIds = recentMessages.map((m) => m.id);

    // Try bulk delete first if 2 or more recent messages exist
    let bulkSuccess = false;
    if (recentIds.length >= 2) {
      const bulkRes = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages/bulk-delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: recentIds }),
        }
      );

      if (bulkRes.status === 204 || bulkRes.ok) {
        bulkSuccess = true;
        totalDeleted += recentIds.length;
      } else if (bulkRes.status === 403) {
        lackedManagePermission = true;
      }
    }

    // If bulk delete did not run or lacked permission, delete messages individually
    if (!bulkSuccess) {
      for (const msg of messages) {
        try {
          const delRes = await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages/${msg.id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bot ${token}` },
            }
          );
          if (delRes.status === 204 || delRes.ok) {
            totalDeleted++;
          } else if (delRes.status === 403) {
            lackedManagePermission = true;
          }
        } catch {
          // ignore individual deletion error
        }
      }
    }

    const permissionNotice = lackedManagePermission
      ? "\n\n⚠️ **Note**: Vista bot lacks the **'Manage Messages'** permission in your Discord server. It was able to delete bot messages, but to allow purging messages from all users, turn on **'Manage Messages'** in **Server Settings ➔ Roles ➔ Vista**."
      : "";

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: 64, // Ephemeral: strictly visible to caller so channel stays clean
        embeds: [
          {
            title: "🧹 Channel Cleaned",
            description: `Successfully cleared **${totalDeleted}** message${
              totalDeleted === 1 ? "" : "s"
            }.${permissionNotice}`,
            color: totalDeleted > 0 ? 0x10b981 : 0xf59e0b,
            fields: [
              { name: "Target", value: isAll ? "All Messages" : `${target} messages`, inline: true },
              { name: "Authorized By", value: `@${callerUser}`, inline: true },
              { name: "PIN Verification", value: "✅ Authorized (Chief PIN)", inline: true },
            ],
            footer: { text: "ZipTabs Defense Grid • Channel Purge Complete" },
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
        content: `❌ Error clearing messages: ${err?.message || "Unknown error"}`,
      },
    });
  }
}

export async function POST(req: NextRequest) {
  const clientIp = extractClientIp(req);
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

    // --- COMMAND: /lockdown (unified with legacy /vanish) ---
    if (commandName === "lockdown" || commandName === "vanish") {
      const state = String(options.state || "status").toLowerCase().trim();

      // If user typed PIN as an argument, verify it directly
      if (providedPin) {
        if (!isConstantTimePinValid(providedPin, REQUIRED_PIN)) {
          return sendPinDeniedResponse(commandName, callerUser);
        }
        return handleLockdownAction(state, callerUser, clientIp);
      }

      // If PIN was NOT typed (Recommended: hides PIN completely from chat typing):
      // Return a private Discord Modal Popup!
      return NextResponse.json({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: `lockdown_modal:${state}`,
          title: "ZipTabs Authorization",
          components: [
            {
              type: 1, // Action row
              components: [
                {
                  type: 4, // Text input
                  custom_id: "pin",
                  label: "Enter Chief PIN",
                  style: 1, // Short
                  min_length: 4,
                  max_length: 10,
                  placeholder: "••••",
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }

    // --- COMMAND: /status ---
    if (commandName === "status") {
      if (providedPin) {
        if (!isConstantTimePinValid(providedPin, REQUIRED_PIN)) {
          return sendPinDeniedResponse(commandName, callerUser);
        }
        return handleStatusQuery();
      }

      // Open private modal popup so PIN is never typed in chat
      return NextResponse.json({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: "status_modal",
          title: "ZipTabs Authorization",
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: "pin",
                  label: "Enter Chief PIN",
                  style: 1,
                  min_length: 4,
                  max_length: 10,
                  placeholder: "••••",
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }

    // --- COMMAND: /clear ---
    if (commandName === "clear") {
      const target = String(options.target || "all").toLowerCase().trim();
      const channelId = body.channel_id || body.channel?.id;

      if (providedPin) {
        if (!isConstantTimePinValid(providedPin, REQUIRED_PIN)) {
          return sendPinDeniedResponse(commandName, callerUser);
        }
        return handleClearChannel(channelId, target, callerUser);
      }

      // Open private modal popup so PIN is never typed in chat
      return NextResponse.json({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: `clear_modal:${target}`,
          title: "ZipTabs Authorization",
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: "pin",
                  label: "Enter Chief PIN",
                  style: 1,
                  min_length: 4,
                  max_length: 10,
                  placeholder: "••••",
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: 64,
        content: `❓ Unknown command: \`/${commandName}\`.`,
      },
    });
  }

  // 3. Handle Modal Submissions (Secret PIN entered in private popup)
  if (body.type === InteractionType.MODAL_SUBMIT) {
    const customId = String(body.data?.custom_id || "");
    const callerUser = body.member?.user?.username || body.user?.username || "Discord User";

    let submittedPin = "";
    for (const actionRow of body.data?.components || []) {
      for (const comp of actionRow.components || []) {
        if (comp.custom_id === "pin") {
          submittedPin = String(comp.value || "").trim();
        }
      }
    }

    if (!isConstantTimePinValid(submittedPin, REQUIRED_PIN)) {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 64, // Ephemeral: strictly visible to caller only
          embeds: [
            {
              title: "🚫 Access Denied: Invalid Security PIN",
              description: "The security PIN entered in the popup was incorrect. Action blocked.",
              color: 0xe11d48,
              fields: [
                { name: "Caller", value: `@${callerUser}`, inline: true },
                { name: "Status", value: "Action Blocked", inline: true },
              ],
              footer: { text: "ZipTabs Defense Grid • Verification Failed" },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    }

    if (customId.startsWith("lockdown_modal:")) {
      const state = customId.split(":")[1] || "status";
      return handleLockdownAction(state, callerUser, clientIp);
    }

    if (customId.startsWith("clear_modal:")) {
      const target = customId.split(":")[1] || "all";
      const channelId = body.channel_id || body.channel?.id;
      return handleClearChannel(channelId, target, callerUser);
    }

    if (customId === "status_modal") {
      return handleStatusQuery();
    }
  }

  return NextResponse.json({ error: "Unsupported interaction" }, { status: 400 });
}
