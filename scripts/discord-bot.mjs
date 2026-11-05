/**
 * Optional Lightweight Discord Channel Bot Listener
 * 
 * If you prefer typing direct commands in a private Discord channel instead of slash commands:
 *   !lockdown on 8977
 *   !lockdown off 8977
 *   !status 8977
 * 
 * Run with:
 *   node scripts/discord-bot.mjs <BOT_TOKEN> <ZIPTABS_BASE_URL>
 */

const [, , token, baseUrl = "http://localhost:3000"] = process.argv;

if (!token) {
  console.log(`
Usage:
  node scripts/discord-bot.mjs <BOT_TOKEN> [ZIPTABS_BASE_URL]

Example:
  node scripts/discord-bot.mjs MTA... https://ziptabs.vercel.app
`);
  process.exit(1);
}

console.log(`Starting ZipTabs Discord Bot Listener for ${baseUrl}...`);
console.log(`(For native serverless slash commands, use /api/discord/interactions instead)`);
