// 📜 commands/listbusinesses.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Property = require('../economy/propertyModel');
const { getBalance, removeCash } = require('../economy/currency');
const DealerProfile = require('../economy/dealerProfileModel');

module.exports = {
  name: 'listbusinesses',
  async execute(message) {
    const all = await Property.find({ ownerId: null }).sort({ price: 1 });
    if (!all.length) return message.reply("🎉 All businesses have been claimed!");

    let page = 0;
    const perPage = 1;

    const renderEmbed = (index) => {
      const prop = all[index];
      const embed = new EmbedBuilder()
        .setTitle(`🏢 ${prop.type} — ${prop.id}`)
        .setDescription(`
📍 **Location**: ${prop.area}
🏷️ **Tier**: ${prop.tier}
💰 **Price**: $${prop.price.toLocaleString()}
📦 **+${prop.stashBonus} Stash Cap**

${prop.eventType ? `🎲 **Event Chance**: ${formatEvent(prop.eventType)}` : '—'}
        `)
        .setFooter({ text: `Page ${index + 1}/${all.length}` })
        .setColor('#33cc99');
      return embed;
    };

    const renderButtons = (index) => {
      const prop = all[index];
      const nav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('biz_prev').setLabel('⏮️ Prev').setStyle(ButtonStyle.Primary).setDisabled(index === 0),
        new ButtonBuilder().setCustomId('biz_next').setLabel('⏭️ Next').setStyle(ButtonStyle.Primary).setDisabled(index === all.length - 1),
        new ButtonBuilder().setCustomId(`buy_business_${prop.id}`).setLabel(`Buy ${prop.id}`).setStyle(ButtonStyle.Success)
      );
      return [nav];
    };

    const msg = await message.reply({ embeds: [renderEmbed(page)], components: renderButtons(page) });

    const collector = msg.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) return i.reply({ content: '❌ Not your menu.', ephemeral: true });

      if (i.customId === 'biz_next' && page < all.length - 1) page++;
      else if (i.customId === 'biz_prev' && page > 0) page--;

      await i.update({ embeds: [renderEmbed(page)], components: renderButtons(page) });
    });

    collector.on('end', () => msg.edit({ components: [] }));
  }
};

function formatEvent(type) {
  const events = {
    heist: "💣 Casino Heist (Big Payday Risk)",
    ipo: "📈 Tech IPO (Price Spike Chance)",
    robbery: "🔫 Bank Robbery (Security Boost or Loss)",
    rent_spike: "📊 Rent Spike (+20% Passive)",
    viral_tiktok: "🎬 TikTok Viral Ad (Double Revenue)",
    gaming_night: "🕹️ Arcade Tournament (XP Surge)",
    investigation: "🛰️ Gov Investigation (Penalty or Perk)",
    leak_risk: "💧 Oil Spill Risk (Lose Income)",
    celebrity_visit: "🌟 Celebrity Visit (5X Bonus Day)",
    premiere_bonanza: "🎥 Premiere Event (Pack the House!)",
    clearance_sale: "💵 Clearance Sale (Fast Boost + Heat)"
  };
  return events[type] || 'No special event.';
} 
 