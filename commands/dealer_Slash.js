// commands/deal.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deal')
    .setDescription('Launch the Street Walk experience inside Discord'),
  async execute(interaction) {
    const voice = interaction.member?.voice?.channel;
    if (!voice) {
      return interaction.reply({ content: '👋 Join a voice channel first, then run /deal.', ephemeral: true });
    }

    // Needs Create Invite on that voice channel
    try {
      const applicationId = process.env.STREETWALK_APP_ID || process.env.ACTIVITY_APP_ID;
      if (!applicationId) {
        return interaction.reply({
          content: '⚙️ Street Walk activity is not configured. Set STREETWALK_APP_ID (or ACTIVITY_APP_ID) and try again.',
          ephemeral: true
        });
      }

      const permissions = interaction.guild.members.me?.permissionsIn(voice);
      if (permissions && !permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
        return interaction.reply({
          content: '❌ I need the **Create Invite** permission in this voice channel to launch Street Walk.',
          ephemeral: true
        });
      }

      const invite = await interaction.guild.invites.create(voice.id, {
        targetApplication: applicationId,
        targetType: 2,
        maxAge: 86400,
        maxUses: 0
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Open Street Walk')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/invite/${invite.code}`)
      );

      return interaction.reply({
        content: `🚶 Click to launch Street Walk in **${voice.name}**`,
        components: [row],
        ephemeral: true
      });
    } catch (err) {
      console.error('Activity invite error:', err);
      return interaction.reply({ content: '❌ Unable to create activity invite. Check bot permissions.', ephemeral: true });
    }
  }
};
