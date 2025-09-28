// scripts/register-slash.js
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

const streetwalk = new SlashCommandBuilder()
  .setName('streetwalk')
  .setDescription('Launch the Street Walk experience inside Discord');

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: [streetwalk.toJSON()] }
  );
  console.log('✅ /streetwalk registered');
})();
