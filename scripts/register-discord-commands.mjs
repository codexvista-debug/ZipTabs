/**
 * ZipTabs Discord Slash Commands Registration Script
 * 
 * Usage:
 *   node scripts/register-discord-commands.mjs <APPLICATION_ID> <BOT_TOKEN> [GUILD_ID]
 * 
 * If GUILD_ID is provided, commands are registered instantly for that specific server.
 * If omitted, commands are registered globally (takes up to a few minutes).
 */

const [,, appId, token, guildId] = process.argv;

if (!appId || !token) {
  console.log(`
Usage:
  node scripts/register-discord-commands.mjs <APPLICATION_ID> <BOT_TOKEN> [GUILD_ID]

Example:
  node scripts/register-discord-commands.mjs 123456789012345678 MTA... 987654321098765432
`);
  process.exit(1);
}

const commands = [
  {
    name: "vanish",
    description: "Control ZipTabs Vanish Mode (Wikipedia Cloaking)",
    options: [
      {
        name: "state",
        description: "Turn Vanish Mode on, off, or check current status",
        type: 3, // STRING
        required: true,
        choices: [
          { name: "🔒 Activate (ON)", value: "on" },
          { name: "🟢 Deactivate (OFF)", value: "off" },
          { name: "📊 Check Status", value: "status" },
        ],
      },
      {
        name: "pin",
        description: "Enter your secret authorization PIN",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "whitelist",
    description: "Whitelist an IP address for ZipTabs access during Vanish Mode",
    options: [
      {
        name: "ip",
        description: "IP address to allow (e.g. 49.43.232.217)",
        type: 3, // STRING
        required: true,
      },
      {
        name: "pin",
        description: "Enter your secret authorization PIN",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "status",
    description: "Get real-time operational status of ZipTabs",
    options: [
      {
        name: "pin",
        description: "Enter your secret authorization PIN",
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

async function registerCommands() {
  const url = guildId
    ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${appId}/commands`;

  console.log(`Registering ${commands.length} slash commands to Discord...`);
  console.log(`Target: ${guildId ? `Server (Guild: ${guildId})` : "Global"}`);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Discord API error (${res.status}):`, errorText);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✅ Successfully registered ${data.length} slash commands:`);
  data.forEach((cmd) => console.log(`   - /${cmd.name}: ${cmd.description}`));
  console.log("\nYou're all set! Commands are now active in Discord.");
}

registerCommands().catch(console.error);
