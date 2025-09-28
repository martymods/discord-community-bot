// commands/streetwalk.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streetwalk')
    .setDescription('Launch the Street Walk experience inside Discord'),
  async execute(interaction) {
    console.log('[streetwalk] command invoked', {
      guildId: interaction.guildId,
      userId: interaction.user?.id,
      channelId: interaction.channelId
    });

    const voice = interaction.member?.voice?.channel;
    if (!voice) {
      console.warn('[streetwalk] no voice channel detected for member', {
        guildId: interaction.guildId,
        userId: interaction.user?.id
      });
      return interaction.reply({
        content: '👋 Join a voice channel first, then run /streetwalk.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Needs Create Invite on that voice channel
    try {
      const applicationId = process.env.STREETWALK_APP_ID || process.env.ACTIVITY_APP_ID;
      if (!applicationId) {
        console.error('[streetwalk] missing STREETWALK_APP_ID/ACTIVITY_APP_ID environment variable', {
          guildId: interaction.guildId
        });
        return interaction.editReply({
          content: '⚙️ Street Walk activity is not configured. Set STREETWALK_APP_ID (or ACTIVITY_APP_ID) and try again.',
          components: []
        });
      }

      const permissions = interaction.guild.members.me?.permissionsIn(voice);
      console.log('[streetwalk] permission check', {
        guildId: interaction.guildId,
        channelId: voice.id,
        hasCreateInstantInvite: permissions?.has(PermissionFlagsBits.CreateInstantInvite) ?? null,
        permissions: permissions?.toArray?.() ?? null
      });
      if (permissions && !permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
        return interaction.editReply({
          content: '❌ I need the **Create Invite** permission in this voice channel to launch Street Walk.',
          components: []
        });
      }

      console.log('[streetwalk] creating activity invite', {
        guildId: interaction.guildId,
        channelId: voice.id,
        applicationId
      });
      const invite = await interaction.guild.invites.create(voice.id, {
        targetApplication: applicationId,
        targetType: 2,
        maxAge: 86400,
        maxUses: 0
      });

      console.log('[streetwalk] invite created successfully', {
        guildId: interaction.guildId,
        channelId: voice.id,
        inviteCode: invite?.code,
        expiresAt: invite?.expiresAt
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Open Street Walk')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/invite/${invite.code}`)
      );

      return interaction.editReply({
        content: `🚶 Click to launch Street Walk in **${voice.name}**`,
        components: [row]
      });
    } catch (err) {
      console.error('[streetwalk] activity invite error', {
        guildId: interaction.guildId,
        channelId: voice.id,
        errorMessage: err?.message,
        errorCode: err?.code,
        rawError: err
      });
      if (
        err?.code === 50035 &&
        typeof err?.message === 'string' &&
        err.message.includes('GUILD_INVITE_INVALID_APPLICATION')
      ) {
        return interaction.editReply({
          content:
            '❌ Discord rejected the Street Walk application ID. Double-check that STREETWALK_APP_ID is set to an embedded activity ID that your server has access to.',
          components: []
        });
      }

      return interaction.editReply({
        content: '❌ Unable to create activity invite. Check bot permissions.',
        components: []
      });
    }
  }
};
