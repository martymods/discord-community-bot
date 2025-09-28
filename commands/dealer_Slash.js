// commands/streetwalk.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { logStreetwalkEvent } = require('../utils/streetwalkLogger');

const KNOWN_STREETWALK_EMBEDDED_APP_ID = '1037680572660727848';

function resolveStreetwalkAppIds() {
  const envIds = [process.env.STREETWALK_APP_ID, process.env.ACTIVITY_APP_ID]
    .filter(Boolean)
    .flatMap(value =>
      String(value)
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
    );

  const ids = new Set(envIds);
  if (KNOWN_STREETWALK_EMBEDDED_APP_ID && !ids.has(KNOWN_STREETWALK_EMBEDDED_APP_ID)) {
    ids.add(KNOWN_STREETWALK_EMBEDDED_APP_ID);
  }

  return [...ids];
}

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
    logStreetwalkEvent('command_invoked', {
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
      logStreetwalkEvent('missing_voice_channel', {
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
      const candidateAppIds = resolveStreetwalkAppIds();
      if (!candidateAppIds.length) {
        console.error('[streetwalk] missing STREETWALK_APP_ID/ACTIVITY_APP_ID environment variable', {
          guildId: interaction.guildId
        });
        logStreetwalkEvent('missing_app_id_configuration', {
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
      logStreetwalkEvent('permission_check', {
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

      const attemptedErrors = [];
      let invite = null;
      let usedApplicationId = null;

      for (const applicationId of candidateAppIds) {
        console.log('[streetwalk] creating activity invite', {
          guildId: interaction.guildId,
          channelId: voice.id,
          applicationId
        });
        logStreetwalkEvent('creating_activity_invite', {
          guildId: interaction.guildId,
          channelId: voice.id,
          applicationId
        });

        try {
          invite = await interaction.guild.invites.create(voice.id, {
            targetApplication: applicationId,
            targetType: 2,
            maxAge: 86400,
            maxUses: 0
          });
          usedApplicationId = applicationId;
          break;
        } catch (err) {
          attemptedErrors.push({ applicationId, error: err });
          const isInvalidAppId =
            err?.code === 50035 &&
            typeof err?.message === 'string' &&
            err.message.includes('GUILD_INVITE_INVALID_APPLICATION');
          const log = isInvalidAppId ? console.warn : console.error;

          log('[streetwalk] activity invite error', {
            guildId: interaction.guildId,
            channelId: voice.id,
            applicationId,
            errorMessage: err?.message,
            errorCode: err?.code,
            rawError: err
          });
          logStreetwalkEvent('activity_invite_error', {
            guildId: interaction.guildId,
            channelId: voice.id,
            applicationId,
            errorMessage: err?.message,
            errorCode: err?.code
          });

          if (!isInvalidAppId) {
            throw err;
          }
        }
      }

      if (!invite) {
        const allInvalidAppIds =
          attemptedErrors.length > 0 &&
          attemptedErrors.every(attempt =>
            attempt?.error?.code === 50035 &&
            typeof attempt?.error?.message === 'string' &&
            attempt.error.message.includes('GUILD_INVITE_INVALID_APPLICATION')
          );

        if (allInvalidAppIds) {
          const attemptedIdList = attemptedErrors
            .map(attempt => attempt?.applicationId)
            .filter(Boolean)
            .map(id => `• ${id}`)
            .join('\n');

          logStreetwalkEvent('all_activity_ids_invalid', {
            guildId: interaction.guildId,
            channelId: voice.id,
            attemptedApplicationIds: attemptedErrors
              .map(attempt => attempt?.applicationId)
              .filter(Boolean)
          });

          return interaction.editReply({
            content:
              '❌ Discord rejected the configured Street Walk activity IDs. ' +
              'Ensure STREETWALK_APP_ID (or ACTIVITY_APP_ID) only contains embedded Activity IDs your server can launch.' +
              (attemptedIdList ? `\n\nTried application IDs:\n${attemptedIdList}` : ''),
            components: []
          });
        }

        throw attemptedErrors.at(-1)?.error ?? new Error('streetwalk_invite_failed');
      }

      console.log('[streetwalk] invite created successfully', {
        guildId: interaction.guildId,
        channelId: voice.id,
        applicationId: usedApplicationId,
        inviteCode: invite?.code,
        expiresAt: invite?.expiresAt
      });
      logStreetwalkEvent('invite_created', {
        guildId: interaction.guildId,
        channelId: voice.id,
        applicationId: usedApplicationId,
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
        channelId: voice?.id ?? null,
        errorMessage: err?.message,
        errorCode: err?.code,
        rawError: err
      });
      logStreetwalkEvent('activity_invite_exception', {
        guildId: interaction.guildId,
        channelId: voice?.id ?? null,
        errorMessage: err?.message,
        errorCode: err?.code
      });

      const missingCreateInvite = err?.code === 50013 || err?.code === 50001;
      const errorContent = missingCreateInvite
        ? '❌ I need the **Create Invite** permission for that voice channel before I can launch Street Walk.'
        : '❌ Unable to create the Street Walk activity invite right now. Please check bot permissions and try again shortly.';

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: errorContent,
          components: []
        });
      }

      return interaction.reply({
        content: errorContent,
        flags: MessageFlags.Ephemeral,
        components: []
      });
    }
  }
};
