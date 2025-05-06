const { EmbedBuilder } = require('discord.js');
const { drugs } = require('./drugList');

function generateMarketEmbed(user, profile, balance) {
  const embed = new EmbedBuilder()
    .setTitle(`💊 Street Market — ${user.username}`)
    .setDescription(`💰 $${balance} DreamworldPoints\n📦 Stash: ${profile.stashUsed}/${profile.stashCap}`)
    .setColor('#ff55aa')
    .setFooter({ text: `Prices update every 1 minute automatically` });

  const rawPrices = profile.prices instanceof Map
    ? profile.prices
    : new Map(Object.entries(profile.prices));

  for (const d of drugs) {
    const price = rawPrices.get(d.id);
    const priceDisplay = typeof price === 'number' ? `$${price}` : `❓`;

    embed.addFields({
      name: `${d.name}`,
      value: `💸 ${priceDisplay}\nYou own: ${profile.inventory[d.id] || 0}`,
      inline: true
    });
  }

  return embed;
}

module.exports = { generateMarketEmbed };
