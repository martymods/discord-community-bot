// scripts/register-all.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID; // you already have this set on Render

if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN (or BOT_TOKEN).');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  // Figure out application id from the token (avoids needing CLIENT_ID)
  const app = await rest.get(Routes.oauth2CurrentApplication());
  const appId = app.id;

  // Collect all slash command definitions
  const commands = [];
  const commandsDir = path.join(__dirname, '..', 'commands');
  for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))) {
    const mod = require(path.join(commandsDir, file));
    if (mod?.data?.toJSON) commands.push(mod.data.toJSON());
  }
  console.log('Registering commands:', commands.map(c => c.name));

  const route = GUILD_ID
    ? Routes.applicationGuildCommands(appId, GUILD_ID)
    : Routes.applicationCommands(appId);

  await rest.put(route, { body: commands });
  console.log('✅ Slash commands registered at', GUILD_ID ? 'guild' : 'global', 'scope.');
})();
