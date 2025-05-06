// 📁 commands/fashn.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, removeCash } = require('../economy/currency');
const { Inventory } = require('../economy/inventory');
const FashionModel = require('../models/FashionModel');
const { getFashionDrop } = require('../economy/fashionShop'); // ✅ Proper import

module.exports = {
  name: 'fashion',
  async execute(message) {
    console.log("🧵 [FASHN] Command triggered by", message.author.username);

    const drop = getFashionDrop();
    if (!drop.length) {
      console.warn("🚫 [FASHN] No fashion items available in current drop.");
      return message.reply("🚫 No fashion drops available right now. Try later.");
    }

    console.log("📦 [FASHN] Items in drop:", drop.map(i => i.name));

    for (const item of drop) {
      const embed = new EmbedBuilder()
        .setTitle(`👕 ${item.name}`)
        .setDescription(
          `Brand: **${item.brand}**\nPrice: **$${item.price}**\nBuff: **${item.statBuff}**${
            item.tryOnUrl ? `\n[👟 Try It On](${item.tryOnUrl})` : ''
          }`
        )
        .setImage(item.image)
        .setColor('#ff66cc')
        .setFooter({ text: 'Stat buffs based on price tiers. Style = Power.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_fashion_${item.id}`)
          .setLabel(`🛍️ Buy ${item.name}`)
          .setStyle(ButtonStyle.Primary)
      );

      await message.channel.send({ embeds: [embed], components: [row] });
    }

    const collector = message.channel.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async interaction => {
      if (!interaction.customId.startsWith('buy_fashion_')) return;
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'This isn’t your wardrobe.', ephemeral: true });
      }

      const itemId = interaction.customId.replace('buy_fashion_', '');
      console.log(`🛒 [FASHN] Purchase triggered for item ID: ${itemId}`);

      const item = drop.find(i => i.id === itemId);
      if (!item) {
        console.warn(`❌ [FASHN] Item ${itemId} not found in cache.`);
        return interaction.reply({ content: 'This item is no longer available.', ephemeral: true });
      }

      const balance = await getBalance(interaction.user.id, interaction.guildId);
      console.log(`💰 [FASHN] User has $${balance}, needs $${item.price}`);

      if (balance < item.price) {
        return interaction.reply({ content: `❌ You need $${item.price} DreamworldPoints to buy this.`, ephemeral: true });
      }

      await removeCash(interaction.user.id, interaction.guildId, item.price);

      const fashionItem = {
        id: item.id,
        name: item.name,
        brand: item.brand,
        price: item.price,
        image: item.image,
        tryOnUrl: item.tryOnUrl,
        bonusStat: item.statBuff.includes('Agility') ? 'agility' : 'swagger',
        bonusValue: item.price >= 1000 ? 5 : item.price >= 800 ? 3 : 1,
        purchasedAt: new Date()
      };

      console.log("🧾 [FASHN] Saving item to wardrobe:", fashionItem);

      await FashionModel.findOneAndUpdate(
        { userId: interaction.user.id, guildId: interaction.guildId },
        { $push: { items: fashionItem } },
        { upsert: true }
      );

      const confirmEmbed = new EmbedBuilder()
        .setTitle(`🧥 ${item.name} Acquired!`)
        .setDescription(`Brand: **${item.brand}**\nPrice: $${item.price}\nBuff: ${item.statBuff}`)
        .setImage(item.image)
        .setColor('#ffaaff');

      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    });
  }
};
