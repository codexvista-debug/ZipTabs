/**
 * Optional Lightweight Discord Channel Bot Listener
 * 
 * If you prefer typing direct commands in a private Discord channel instead of slash commands:
 *   !vanish on 7416
 *   !vanish off 7416
 *   !whitelist 49.43.x.x 7416
 *   !status 7416
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
