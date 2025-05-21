// commands/lab.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const DealerProfile = require('../economy/dealerProfileModel');
const { drugs } = require('../utils/drugList');

const STAR_EMOJI = '⭐';

module.exports = {
  name: 'lab',
  description: 'View and upgrade your owned drugs in the enhancement lab.',
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    let profile = await DealerProfile.findOne({ userId, guildId });
    if (!profile) {
      return message.reply('❌ Use `!dealer` first to initialize your profile.');
    }

    if (!(profile.inventory instanceof Map)) profile.inventory = new Map(Object.entries(profile.inventory));
    if (!profile.enhancements) profile.enhancements = {};

    const embed = new EmbedBuilder()
      .setTitle(`🧪 Drug Enhancement Lab`)
      .setDescription('Enhance your stash for better resale bonuses. Each enhancement consumes ✨ Purity Crystals and costs DreamworldPoints.')
      .setColor('#9933ff');

    const rows = [];

    for (const drug of drugs) {
      const owned = profile.inventory.get(drug.id) || 0;
      if (owned <= 0) continue;

      const level = profile.enhancements[drug.id] || 0;
      const stars = STAR_EMOJI.repeat(level);

      embed.addFields({
        name: `${drug.emoji || '💊'} ${drug.name} (${owned}x)`,
        value: `Purity: ${stars || '—'}\nEnhance Cost: ✨ + 💰`,
        inline: true
      });

      rows.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`enhance_drug_${drug.id}`)
            .setLabel(`🔬 Enhance ${drug.name}`)
            .setStyle(ButtonStyle.Primary)
        )
      );
    }

    if (rows.length === 0) {
      return message.reply('❌ You don’t own any drugs to enhance.');
    }

    await message.channel.send({ embeds: [embed], components: rows });
  }
};
 