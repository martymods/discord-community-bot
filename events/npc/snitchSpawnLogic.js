// npc/snitchSpawnLogic.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getInventory } = require('../../economy/inventory');

const { spawnBuyer } = require('./npcBuyers');

async function spawnSnitch(client, channel, userId) {
  const drugTypes = ['weed', 'meth', 'acid', 'heroin', 'shrooms'];
  const drugId = drugTypes[Math.floor(Math.random() * drugTypes.length)];
  const image = `https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/snitch_${drugId}_0.png`;

  const quantity = Math.floor(Math.random() * 8) + 3;
  const randomMultiplier = (Math.random() * 2) + 2;   // 2.0–4.0 (200%-400%)
  const bonus = parseFloat(randomMultiplier.toFixed(2));

  const fake = Math.random() < 0.3; // 30% chance fake snitch

  // 🧠 SAVE inventory snapshot
  const inventory = await getInventory(userId, channel.guild.id);

  const snitch = {
    name: `Snitch (${drugId})`,
    bonus,
    drug: drugId,
    quantity,
    fake,
    inventory, // 🔥 Attach here
  };

  const embed = new EmbedBuilder()
    .setTitle(`🕵️‍♂️ Suspicious Figure Appears: Snitch (${drugId})`)
    .setDescription(`They want **${quantity}x ${drugId.toUpperCase()}**...\nOffering **${Math.floor(bonus * 100)}%** of market value.\n> 🧠 Profile: Shadowy figure. Watches every move. Trust at your own risk.\n> ❗ Sell carefully... Some deals are too good to be true.`)
    .setImage(image)
    .setColor('#ffaa00')
    .setFooter({ text: 'Sell carefully. Some deals are too good to be true...' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`snitch_sell_${userId}_${drugId}_${quantity}`)
      .setLabel(`Sell ${quantity}x ${drugId.toUpperCase()}`)
      .setStyle(ButtonStyle.Danger)
  );

  const message = await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [row] });

  snitch.messageId = message.id;

  client.activeSnitches = client.activeSnitches || new Map();
  client.activeSnitches.set(message.id, snitch);

  // 🕒 Auto remove after 45s
  setTimeout(async () => {
    const fetched = await channel.messages.fetch(message.id).catch(() => null);
    if (fetched) await fetched.delete().catch(() => {});
    client.activeSnitches.delete(message.id);
  }, 45000);

  // 🎲 50% chance spawn real buyer
  if (Math.random() < 0.5) {
    spawnBuyer(client);
  }
}

module.exports = { spawnSnitch };
