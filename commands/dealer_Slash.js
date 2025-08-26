// commands/dealer.js
const {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dealer')
    .setDescription('Launch the Dreamworld Typing Game as a Discord activity'),
  async execute(interaction) {
    const voice = interaction.member?.voice?.channel;
    if (!voice) {
      return interaction.reply({ content: '👋 Join a voice channel first, then run /dealer.', ephemeral: true });
    }

    // Needs Create Invite on that voice channel
    try {
      const invite = await voice.createInvite({
        targetApplication: process.env.ACTIVITY_APP_ID, // your Discord App (Embedded App) ID
        targetType: 2,                                   // 2 = Embedded Application
        maxAge: 86400,
        maxUses: 0
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Open Dreamworld Game')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/invite/${invite.code}`)
      );

      return interaction.reply({
        content: `🎮 Click to launch the game in **${voice.name}**`,
        components: [row],
        ephemeral: true
      });
    } catch (err) {
      console.error('Activity invite error:', err);
      return interaction.reply({ content: '❌ Unable to create activity invite. Check bot permissions.', ephemeral: true });
    }
  }
};
