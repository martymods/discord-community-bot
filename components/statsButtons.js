const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getPlayerStats, spendStatPoint, resetStats } = require('../statUtils');
const buildStatButtons = require('./statsButtonBuilder');

const defaultStats = {
  strength: 0,
  agility: 0,
  grit: 0,
  luck: 0,
  intellect: 0,
  vitality: 0,
  points: 0
};

function formatStat(value) {
  if (value >= 10) return `**\`${value}\` ✅**`; // high = green
  if (value <= 2) return `**\`${value}\` ⚠️**`;  // low = red
  return `**${value}**`;
}

module.exports = async function handleStatButton(interaction) {
  if (!interaction.customId || typeof interaction.customId !== 'string') return;
  const [_, action, target] = interaction.customId.split('_');

  if (interaction.user.id !== target) {
    return interaction.reply({ content: '🚫 Only the original user can use these buttons.', ephemeral: true });
  }

  // 🌀 Reset logic
  if (action === 'reset') {
    await resetStats(interaction.user.id, interaction.guildId);
  } else {
    const success = await spendStatPoint(interaction.user.id, interaction.guildId, action);
    if (!success) {
      return interaction.reply({ content: '❌ Not enough points to spend.', ephemeral: true });
    }
  }

  const rawStats = await getPlayerStats(interaction.user.id, interaction.guildId);
  const stats = { ...defaultStats, ...(rawStats._doc || rawStats) };

  const statEmbed = new EmbedBuilder()
    .setTitle(`${interaction.user.username}'s Stats`)
    .setDescription(`You have **${stats.points}** stat points to spend.`)
    .addFields([
      { name: '💪 Strength', value: formatStat(stats.strength), inline: true },
      { name: '🦶 Agility', value: formatStat(stats.agility), inline: true },
      { name: '💥 Grit', value: formatStat(stats.grit), inline: true },
      { name: '🍀 Luck', value: formatStat(stats.luck), inline: true },
      { name: '🧠 Intellect', value: formatStat(stats.intellect), inline: true },
      { name: '❤️ Vitality', value: formatStat(stats.vitality), inline: true }
    ])
    .setColor('#ffaa00');

  const statButtons = buildStatButtons(interaction.user.id, stats.points);
  statButtons.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stat_reset_${interaction.user.id}`)
        .setLabel('🔄 Reset Stats')
        .setStyle(ButtonStyle.Danger)
    )
  );

  await interaction.update({ embeds: [statEmbed], components: statButtons });
};
