// commands/combine.js
const { Inventory, removeItem, addItem } = require('../economy/inventory');
const DealerProfile = require('../economy/dealerProfileModel');
const { EmbedBuilder } = require('discord.js');

const RECIPES = {
  // acid x3 + purity_crystal = rainbow_acid
  rainbow_acid: {
    requires: {
      acid: 3,
      purity_crystal: 1
    },
    result: 'rainbow_acid',
    name: '🌈 Rainbow Acid'
  }
};

module.exports = {
  name: 'combine',
  description: 'Combine drugs/items to create rare variants.',
  async execute(message, args) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const recipeKey = args[0]?.toLowerCase();

    if (!RECIPES[recipeKey]) {
      const available = Object.keys(RECIPES).map(r => `\`${r}\``).join(', ');
      return message.reply(`❌ Unknown recipe. Available: ${available}`);
    }

    const recipe = RECIPES[recipeKey];
    const inv = await Inventory.findOne({ userId, guildId });
    if (!inv) return message.reply('❌ You have no inventory.');

    const items = inv.items || new Map();
    const missing = [];
    for (const [item, qty] of Object.entries(recipe.requires)) {
      if ((items.get(item) || 0) < qty) missing.push(`${item} x${qty}`);
    }

    if (missing.length) {
      return message.reply(`❌ Missing ingredients: ${missing.join(', ')}`);
    }

    // Deduct ingredients
    for (const [item, qty] of Object.entries(recipe.requires)) {
      await removeItem(userId, guildId, item, qty);
    }

    // Add result
    await addItem(userId, guildId, recipe.result);

    const embed = new EmbedBuilder()
      .setTitle('🔬 Recipe Complete!')
      .setDescription(`You created **${recipe.name}**!`)
      .setColor('#ff66cc');

    return message.reply({ embeds: [embed] });
  }
};
