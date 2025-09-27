// scripts/register-slash.js
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

const deal = new SlashCommandBuilder()
  .setName('deal')
  .setDescription('Launch the Street Walk experience inside Discord');

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: [deal.toJSON()] }
  );
  console.log('✅ /deal registered');
})();
