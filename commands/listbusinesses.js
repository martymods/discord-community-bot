// 📜 commands/listbusinesses.js (FINAL - SHOW ALL BUSINESSES + OWNERSHIP TAGS)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Property = require('../economy/propertyModel');
const DealerProfile = require('../economy/dealerProfileModel');

module.exports = {
  name: 'listbusinesses',
  async execute(message) {
    const all = await Property.find({}).sort({ price: 1 }); // Show ALL, not just unowned
    if (!all.length) return message.reply("😕 No businesses found.");

    let page = 0;

    const renderEmbed = async (index) => {
      const prop = all[index];
      const ownerMention = prop.ownerId ? `<@${prop.ownerId}>` : 'Nobody';

      console.log("[LISTBUSINESSES DEBUG]", {
        id: prop.id,
        name: prop.name,
        type: prop.type,
        tier: prop.tier,
        area: prop.area,
        ownerId: prop.ownerId
      });

      return new EmbedBuilder()
        .setTitle(`🏢 ${prop.name || prop.type || prop.id}`)
        .setDescription(
          `📍 **Location**: ${prop.area}
🏷️ **Tier**: ${prop.tier}
💰 **Price**: $${prop.price.toLocaleString()}
📦 **+${prop.stashBonus} Stash Cap**
👤 **Owned By**: ${ownerMention}`
        )
        .setFooter({ text: `Page ${index + 1}/${all.length}` })
        .setColor('#33cc99');
    };

    const renderButtons = (index) => {
      const prop = all[index];
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('biz_prev')
          .setLabel('⏮️ Prev')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(index === 0),
        new ButtonBuilder()
          .setCustomId('biz_next')
          .setLabel('⏭️ Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(index === all.length - 1),
        new ButtonBuilder()
          .setCustomId(`buy_business_${prop.id}`)
          .setLabel(`Buy ${prop.name || prop.id}`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(!!prop.ownerId) // Disable if already owned
      );
      return [row];
    };

    const msg = await message.reply({
      embeds: [await renderEmbed(page)],
      components: renderButtons(page)
    });

    const collector = msg.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: '❌ Not your menu.', ephemeral: true });
      }

      if (i.customId === 'biz_next' && page < all.length - 1) page++;
      else if (i.customId === 'biz_prev' && page > 0) page--;

      await i.update({
        embeds: [await renderEmbed(page)],
        components: renderButtons(page)
      });
    });

    collector.on('end', () => msg.edit({ components: [] }));
  }
};
