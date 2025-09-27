// commands/dealer.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dealer')
    .setDescription('Provides information about the dealer tools.'),
  async execute(interaction) {
    return interaction.reply({
      content: '🛠️ Dealer tools are available with the legacy prefix command. Use **/streetwalk** to launch the embedded game.',
      ephemeral: true
    });
  }
};
