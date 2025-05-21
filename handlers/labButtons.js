// handlers/labButtons.js
const { enhanceDrug } = require('../economy/drugEnhance');
const { EmbedBuilder } = require('discord.js');
const { getDrugName } = require('../utils/drugList');

async function handleLabButton(interaction) {
  const { customId, user, guildId } = interaction;

  if (!customId.startsWith('enhance_drug_')) return;

  const drugId = customId.replace('enhance_drug_', '');

  try {
    await interaction.deferReply({ ephemeral: true });
    const result = await enhanceDrug(user.id, guildId, drugId);

    const emoji = result.success ? '✅' : '❌';
    const drugName = getDrugName(drugId);
    const stars = '⭐'.repeat(result.level);

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${drugName} Enhancement Result`)
      .setDescription(result.success
        ? `✨ Upgrade succeeded!
New purity: ${stars}`
        : `💥 Upgrade failed.
New purity: ${stars}`)
      .setColor(result.success ? '#33ff99' : '#ff3333');

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[ENHANCE BUTTON ERROR]', err);
    return interaction.editReply({ content: `❌ ${err.message}`, ephemeral: true });
  }
}

module.exports = { handleLabButton }; 
