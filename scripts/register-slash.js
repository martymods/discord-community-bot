// scripts/register-slash.js
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

const dealer = new SlashCommandBuilder()
  .setName('dealer')
  .setDescription('Launch the Dreamworld Typing Game as a Discord activity');

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: [dealer.toJSON()] }
  );
  console.log('✅ /dealer registered');
})();
