const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streetwalk')
    .setDescription('Launch the Streetwalk web game as a Discord activity.'),
  async execute(interaction) {
    const voice = interaction.member?.voice?.channel;
    if (!voice) {
      return interaction.reply({ content: '👋 Join a voice channel first, then run /streetwalk.', ephemeral: true });
    }

    try {
      const invite = await voice.createInvite({
        targetApplication: process.env.ACTIVITY_APP_ID,
        targetType: 2,
        maxAge: 86400,
        maxUses: 0
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Open Streetwalk Game')
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
