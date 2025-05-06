const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getInventory } = require('../../economy/inventory');
const { items } = require('../../economy/items');
const { getMood, getMoodEffect } = require('./npcReputation');

const itemMap = new Map(items.map(item => [item.id, item]));

function getImageURL(file) {
  return `https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/${file}`;
}

async function spawnFenceDealer(client, user, guildId) {
  const inv = await getInventory(user.id, guildId);
  if (!inv || inv.size === 0) return;

  const sellable = items.filter(i => inv.has(i.id) && inv.get(i.id) >= 2);
  if (!sellable.length) return;

  const item = sellable[Math.floor(Math.random() * sellable.length)];
  const mood = getMood(user.id, 'Fence') || 0;
  const moodEffect = getMoodEffect(mood);
  const base = item.value;

  const quantity = Math.floor(Math.random() * 5) + 2; // 2–6 items
  const multiplier = (Math.random() * 3 + 3); // 3.0x to 6.0x
  const finalOffer = Math.floor(base * quantity * moodEffect * multiplier);

  const randomFenceImage = `fence_buyer_${Math.floor(Math.random() * 9)}.png`;

  const embed = new EmbedBuilder()
    .setTitle(`🧥 Fence Dealer Wants a Word...`)
    .setDescription(`"Psst... <@${user.id}>. I see you've been busy."\n\nI’ll give you **$${finalOffer.toLocaleString()}** for **${quantity}x ${item.name}**.\nYou in?`)
    .setColor('#996633')
    .setImage(getImageURL(randomFenceImage))
    .setFooter({ text: "Fence offers come once... maybe." })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`fence_sell_${item.id}_${finalOffer}_${user.id}_${quantity}`)
      .setLabel(`Sell ${quantity}x ${item.name}`)
      .setStyle(ButtonStyle.Success)
  );

  const channel = client.channels.cache.get('1353730054693064819') ||
                  client.channels.cache.find(c => c.name === 'general');

  if (channel) {
    console.log(`[FENCE DEBUG] Sending to channel: ${channel.name}`);
    channel.send({ content: `🧥 <@${user.id}>`, embeds: [embed], components: [row] });
  } else {
    console.warn(`[FENCE DEBUG] No channel found`);
  }
}

module.exports = { spawnFenceDealer };
