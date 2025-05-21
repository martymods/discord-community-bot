// commands/combine.js
const { Inventory, removeItem, addItem } = require('../economy/inventory');
const DealerProfile = require('../economy/dealerProfileModel');
const { EmbedBuilder } = require('discord.js');

const RECIPES = {
  // Core drug enhancements
  rainbow_acid: { requires: { acid: 3, purity_crystal: 1 }, result: 'rainbow_acid', name: '🌈 Rainbow Acid' },
  ultra_meth: { requires: { meth: 2, purity_crystal: 1 }, result: 'ultra_meth', name: '🔥 Ultra Meth' },

  // Advanced evolutions
  god_acid: { requires: { rainbow_acid: 2, purity_crystal: 2 }, result: 'god_acid', name: '🧬 God Acid' },
  omega_meth: { requires: { ultra_meth: 2, purity_crystal: 2 }, result: 'omega_meth', name: '💥 Omega Meth' },
  dream_heroin: { requires: { heroin: 2, purity_crystal: 1 }, result: 'dream_heroin', name: '🌙 Dream Heroin' },
  void_heroin: { requires: { dream_heroin: 2, purity_crystal: 2 }, result: 'void_heroin', name: '🌌 Void Heroin' },
  quantum_shrooms: { requires: { shrooms: 2, purity_crystal: 1 }, result: 'quantum_shrooms', name: '🍄 Quantum Shrooms' },
  holo_shrooms: { requires: { quantum_shrooms: 2, purity_crystal: 1 }, result: 'holo_shrooms', name: '🪐 Holo Shrooms' },
  time_shrooms: { requires: { holo_shrooms: 2, purity_crystal: 2 }, result: 'time_shrooms', name: '⏳ Time Shrooms' },

  // Yield-enhanced combinations
  rainbow_acid_x10: { requires: { rainbow_acid: 1, yield_x10: 1 }, result: 'rainbow_acid', name: '🌈 Rainbow Acid x10', quantity: 10 },
  rainbow_acid_x50: { requires: { rainbow_acid: 1, yield_x50: 1 }, result: 'rainbow_acid', name: '🌈 Rainbow Acid x50', quantity: 50 },
  ultra_meth_x100: { requires: { ultra_meth: 1, yield_x100: 1 }, result: 'ultra_meth', name: '🔥 Ultra Meth x100', quantity: 100 },
  god_acid_x50: { requires: { god_acid: 1, yield_x50: 1 }, result: 'god_acid', name: '🧬 God Acid x50', quantity: 50 },
  void_heroin_x50: { requires: { void_heroin: 1, yield_x50: 1 }, result: 'void_heroin', name: '🌌 Void Heroin x50', quantity: 50 },
  time_shrooms_x100: { requires: { time_shrooms: 1, yield_x100: 1 }, result: 'time_shrooms', name: '⏳ Time Shrooms x100', quantity: 100 },

  // Core drug stacks
  weed_x10: { requires: { weed: 1, yield_x10: 1 }, result: 'weed', name: '🌿 Weed x10', quantity: 10 },
  weed_x50: { requires: { weed: 1, yield_x50: 1 }, result: 'weed', name: '🌿 Weed x50', quantity: 50 },
  weed_x100: { requires: { weed: 1, yield_x100: 1 }, result: 'weed', name: '🌿 Weed x100', quantity: 100 },
  meth_x10: { requires: { meth: 1, yield_x10: 1 }, result: 'meth', name: '💎 Meth x10', quantity: 10 },
  meth_x50: { requires: { meth: 1, yield_x50: 1 }, result: 'meth', name: '💎 Meth x50', quantity: 50 },
  meth_x100: { requires: { meth: 1, yield_x100: 1 }, result: 'meth', name: '💎 Meth x100', quantity: 100 },
  acid_x10: { requires: { acid: 1, yield_x10: 1 }, result: 'acid', name: '🌀 Acid x10', quantity: 10 },
  acid_x50: { requires: { acid: 1, yield_x50: 1 }, result: 'acid', name: '🌀 Acid x50', quantity: 50 },
  acid_x100: { requires: { acid: 1, yield_x100: 1 }, result: 'acid', name: '🌀 Acid x100', quantity: 100 },
  heroin_x10: { requires: { heroin: 1, yield_x10: 1 }, result: 'heroin', name: '🩸 Heroin x10', quantity: 10 },
  heroin_x50: { requires: { heroin: 1, yield_x50: 1 }, result: 'heroin', name: '🩸 Heroin x50', quantity: 50 },
  heroin_x100: { requires: { heroin: 1, yield_x100: 1 }, result: 'heroin', name: '🩸 Heroin x100', quantity: 100 },
  shrooms_x10: { requires: { shrooms: 1, yield_x10: 1 }, result: 'shrooms', name: '🍄 Shrooms x10', quantity: 10 },
  shrooms_x50: { requires: { shrooms: 1, yield_x50: 1 }, result: 'shrooms', name: '🍄 Shrooms x50', quantity: 50 },
  shrooms_x100: { requires: { shrooms: 1, yield_x100: 1 }, result: 'shrooms', name: '🍄 Shrooms x100', quantity: 100 }
};

module.exports = {
  name: 'combine',
  description: 'Combine drugs/items to create rare variants or quantity stacks.',
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

    for (const [item, qty] of Object.entries(recipe.requires)) {
      await removeItem(userId, guildId, item, qty);
    }

    const amount = recipe.quantity || 1;
    await addItem(userId, guildId, recipe.result, amount);

    const embed = new EmbedBuilder()
      .setTitle('🔬 Recipe Complete!')
      .setDescription(`You created **${recipe.name}**!`)
      .setColor('#ff66cc');

    return message.reply({ embeds: [embed] });
  }
};
