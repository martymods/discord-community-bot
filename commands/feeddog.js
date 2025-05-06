// 📦 Updated commands/feeddog.js
const { getInventory, removeItem } = require('../economy/inventory');
const { getDog, setDog } = require('../events/npc/defense/dogSystem');
const { items } = require('../economy/items');
const { execute: refreshDogEmbed } = require('./mydog');

module.exports = {
  name: 'feeddog',
  async execute(messageOrInteraction, args, isButton = false) {
    const itemId = args[0];
    if (!itemId) {
      return messageOrInteraction.reply({ content: "❌ You must specify an item ID to feed." });
    }

    const userId = messageOrInteraction.user?.id || messageOrInteraction.author?.id;
    const guildId = messageOrInteraction.guildId || messageOrInteraction.guild?.id;

    const dog = await getDog(userId, guildId);
    if (!dog) {
      return messageOrInteraction.reply({ content: "❌ You don't have a dog to feed." });
    }

    // 🧹 Cooldown checks
    const now = Date.now();
    if (!dog.feedData) dog.feedData = { count: 0, lastFed: 0 };
    if (dog.feedData.lastFed + 2 * 60 * 1000 > now && dog.feedData.count >= 5) {
      const timeLeft = Math.ceil((dog.feedData.lastFed + 2 * 60 * 1000 - now) / 1000);
      return messageOrInteraction.reply({ content: `⏳ Your dog needs to digest! Wait ${timeLeft}s.` });
    }

    if (dog.feedData.lastFed + 2 * 60 * 1000 < now) {
      dog.feedData.count = 0;
      dog.feedData.lastFed = now;
    }

    let inventory = await getInventory(userId, guildId);
    if (inventory instanceof Map) inventory = Object.fromEntries(inventory);

    const item = items.find(i => i.id === itemId);
    if (!item) {
      return messageOrInteraction.reply({ content: "❌ Invalid item selected." });
    }

    const invQty = inventory[item.id] || 0;
    if (invQty <= 0) {
      return messageOrInteraction.reply({ content: `❌ You don't have a **${item.name}** to feed.` });
    }

    // 🎯 Determine stat type
    const statBoosts = {
      treat_dex: 'dex',
      treat_pow: 'pow',
      treat_mind: 'mind',
      treat_def: 'def'
    };
    const targetedStat = statBoosts[itemId];
    if (!targetedStat) {
      return messageOrInteraction.reply({ content: "❌ You can only feed specific stat treats." });
    }

    if (!dog.statExp) dog.statExp = { def: 0, pow: 0, dex: 0, mind: 0, iq: 0 };
    if (!dog.statExp[targetedStat]) dog.statExp[targetedStat] = 0;

    // 📈 EXP Scaling
    const rarityXP = {
      common: 20,
      rare: 40,
      epic: 60
    };
    const expGain = rarityXP[item.rarity?.toLowerCase()] || 20;
    dog.statExp[targetedStat] += expGain;

    const currentStat = dog.stats[targetedStat] || 0;
    const expNeededForStat = 100 + currentStat * 20;
    if (dog.statExp[targetedStat] >= expNeededForStat) {
      dog.stats[targetedStat] += 1;
      dog.statExp[targetedStat] = 0;
    }

    // 🎉 Global dog EXP & level
    dog.exp += expGain;
    if (dog.exp >= dog.expNeeded) {
      dog.level += 1;
      dog.exp = 0;
      dog.expNeeded += 20;
      await messageOrInteraction.channel.send(`🎉 **LEVEL UP!** Your dog **${dog.name || 'Unnamed Dog'}** reached **Level ${dog.level}**!`);
    }

    // 🩺 Apply HP gain if item has hp field
    if (!dog.hp) dog.hp = 0;
    if (!dog.maxHP) dog.maxHP = 100;
    if (item.hp) {
      const beforeHP = dog.hp;
      dog.hp = Math.min(dog.hp + item.hp, dog.maxHP);
      const healed = dog.hp - beforeHP;
      await messageOrInteraction.channel.send(`🦴 Your dog gained **+${healed} HP** from the **${item.name}**! (${dog.hp}/${dog.maxHP})`);
    }

    // 🍽️ Finalize feed
    dog.feedData.count++;
    dog.feedData.lastFed = now;

    await removeItem(userId, guildId, item.id, 1);
    await setDog(userId, guildId, dog);
    await refreshDogEmbed(messageOrInteraction);
  }
};
