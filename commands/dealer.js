// commands/dealer.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { drugs } = require('../utils/drugList');
const { getBalance, addCash, removeCash } = require('../economy/currency');
const { getInventory, addItem, removeItem, saveInventory } = require('../economy/inventory');
const DealerProfile = require('../economy/dealerProfileModel'); // 👈 ADD THIS LINE
const { generateDrugPrices } = require('../utils/generateDrugPrices');



module.exports = {
  name: 'dealer',
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    let profile = await DealerProfile.findOne({ userId, guildId });

    if (!profile) {
      const initialPrices = generatePrices();
      profile = new DealerProfile({
        userId,
        guildId,
        stashCap: 20,
        stashUsed: 0,
        inventory: {},
        prices: new Map(Object.entries(initialPrices)),
        lastPriceUpdate: Date.now(),
        raidCooldown: 0
      });
      await profile.save();
    }

    if (!(profile.prices instanceof Map)) {
      profile.prices = new Map(Object.entries(profile.prices));
    }

    for (const d of pricedDrugs)      {
      if (typeof profile.inventory[d.id] !== 'number') {
        profile.inventory[d.id] = 0;
      }
    }

    profile.stashUsed = Object.values(profile.inventory).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);

    const now = Date.now();
    if (now - profile.lastPriceUpdate > 60000) {
      const newPrices = generatePrices();
      for (const [key, value] of Object.entries(newPrices)) {
        profile.prices.set(key, value);
      }
      profile.lastPriceUpdate = now;
      await profile.save();
    }

    const balance = await getBalance(userId, guildId);
    const pricedDrugs = generateDrugPrices(drugs);


    const embed = new EmbedBuilder()
      .setTitle(`💊 Street Market - ${message.author.username}`)
      .setDescription(`\u{1F4B0} ${balance} DreamworldPoints\n\u{1F4E6} Stash: ${profile.stashUsed}/${profile.stashCap}\nPrices update every 1 minute automatically.`)
      .setColor('#ff55aa');

      for (const d of pricedDrugs)
        {
      const price = profile.prices.get(d.id);
      embed.addFields({
        name: `${d.name}`,
        value: `\u{1F4B2} $${price ?? '?'}`,
        inline: true
      });
    }

    const buttonRows = [];

    for (const d of pricedDrugs) {
      const price = profile.prices.get(d.id);
      const buyButton = new ButtonBuilder()
        .setCustomId(`buy_drug_${d.id}`)
        .setLabel(`🛒 Buy ${d.name}`)
        .setStyle(ButtonStyle.Success);

      const sellButton = new ButtonBuilder()
        .setCustomId(`sell_drug_${d.id}`)
        .setLabel(`💰 Sell ${d.name}`)
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(buyButton, sellButton);
      buttonRows.push(row);
    }

    const sent = await message.channel.send({ embeds: [embed], components: buttonRows });

    profile.lastMarketMessageId = sent.id;
    await profile.save();
  }
};
