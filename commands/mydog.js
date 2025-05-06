// 📄 commands/mydog.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDogFromDB, getDogImage } = require('../events/npc/defense/dogSystem');
const { getInventory } = require('../economy/inventory');
const { items } = require('../economy/items');

function drawBar(current, max = 100) {
  const totalBlocks = 10;
  const filled = Math.round((current / max) * totalBlocks);
  return '█'.repeat(filled) + '░'.repeat(totalBlocks - filled);
}

module.exports = {
  name: 'mydog',
  async execute(messageOrInteraction) {
    const userId = messageOrInteraction.user?.id || messageOrInteraction.author?.id;
    const guildId = messageOrInteraction.guildId || messageOrInteraction.guild?.id;

    const dog = await getDogFromDB(userId, guildId);
    if (!dog) {
      return messageOrInteraction.reply({ content: "🐶 You don't have a dog yet. Use `!buydog` to adopt one." });
    }

    const dogPic = getDogImage(dog.breed, dog.level);
    const stats = dog.stats || { def: 0, pow: 0, dex: 0, mind: 0, iq: 0, sync: 0 };

    // Load user's inventory
    let inventory = await getInventory(userId, guildId);
    if (inventory instanceof Map) inventory = Object.fromEntries(inventory);

    // 🏯 Find feeding items available
    const feedItems = items.filter(item => item.type === 'dog_treat' && inventory[item.id] > 0);

    const feedRow = new ActionRowBuilder();
    for (const feedItem of feedItems) {
      feedRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`feed_${feedItem.id}`)
          .setLabel(`Feed ${feedItem.name}`)
          .setStyle(ButtonStyle.Success)
      );
    }

    const embed = new EmbedBuilder()
      .setTitle(`🐕 ${dog.name || 'Unnamed Dog'}`)
      .setDescription(`**Breed:** ${dog.breed.charAt(0).toUpperCase() + dog.breed.slice(1)}
**HP:** ${dog.hp}/100
**Mood:** ${dog.mood}
**Level:** ${dog.level}
**Cooldown:** ${dog.cooldown > Date.now() ? `<t:${Math.floor(dog.cooldown / 1000)}:R>` : 'Ready'}

🎖️ **Perks Active:** ${dog.perks && dog.perks.length ? dog.perks.join(', ') : 'None'}`)
      .addFields(
        { name: '🛡️ DEF', value: `${stats.def}  ${drawBar(stats.def)}`, inline: true },
        { name: '💪 POW', value: `${stats.pow}  ${drawBar(stats.pow)}`, inline: true },
        { name: '🎯 DEX', value: `${stats.dex}  ${drawBar(stats.dex)}`, inline: true },
        { name: '🧠 MIND', value: `${stats.mind}  ${drawBar(stats.mind)}`, inline: true },
        { name: '🧬 IQ', value: `${stats.iq}  ${drawBar(stats.iq, 200)}`, inline: true },
        { name: '⚡ SYNC', value: `${stats.sync}%  ${drawBar(stats.sync, 120)}`, inline: true },
        { name: '⭐ EXP', value: `EXP ${dog.exp || 0}/${dog.expNeeded || 100} ${drawBar(dog.exp || 0, dog.expNeeded || 100)}`, inline: true }
      )
      .setThumbnail(dogPic)
      .setColor('#ffaa00')
      .setFooter({ text: 'Feed, battle, and evolve your companion!' });

    if (messageOrInteraction.isButton && messageOrInteraction.isButton()) {
      await messageOrInteraction.update({ embeds: [embed], components: feedItems.length ? [feedRow] : [] });
    } else {
      await messageOrInteraction.reply({ embeds: [embed], components: feedItems.length ? [feedRow] : [] });
    }
  }
};
