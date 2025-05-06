// /economy/deathSystem.js

const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const playerHP = new Map(); // stores { 'guild_user': { hp, maxHP } }
const deadPlayers = new Map(); // stores { userId: { inventory, expiresAt } }

function getKey(userId, guildId) {
  return `${guildId}_${userId}`;
}

function getMaxHP(userId, guildId) {
  const { getPlayerStats } = require('../statUtils'); // ✅ Correct path
  const stats = getPlayerStats(userId, guildId);
  return 50 + (stats.vitality || 0) * 5;
}

function getHP(userId, guildId) {
  const key = getKey(userId, guildId);
  if (!playerHP.has(key)) {
    const maxHP = getMaxHP(userId, guildId);
    playerHP.set(key, { hp: maxHP, maxHP });
  }
  return playerHP.get(key);
}

function setHP(userId, guildId, hp, maxHP) {
  const key = getKey(userId, guildId);
  playerHP.set(key, { hp, maxHP });
}

function reduceHP(userId, guildId, amount) {
  const key = getKey(userId, guildId);
  const current = getHP(userId, guildId);
  const newHP = Math.max(0, current.hp - amount);
  playerHP.set(key, { hp: newHP, maxHP: current.maxHP });
  return newHP;
}

function isDead(userId, guildId) {
  const hp = getHP(userId, guildId);
  return hp.hp <= 0;
}

async function handleDeath(user, guild, inventory, channel) {
  const key = getKey(user.id, guild.id);
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes until loot disappears
  deadPlayers.set(user.id, { inventory, expiresAt });

  const embed = new EmbedBuilder()
    .setTitle(`☠️ ${user.username} Has Fallen!`)
    .setDescription(`They dropped everything...\nLoot expires in **10 minutes**.`)
    .setThumbnail(user.displayAvatarURL())
    .setImage('https://example.com/lootdrop.png') // replace with your image
    .setFooter({ text: 'Use the button below to try to recover your items...' });

  const recoverButton = new ButtonBuilder()
    .setCustomId(`recover_items_${user.id}`)
    .setLabel(`Recover Items (wait 20s)`)
    .setStyle(ButtonStyle.Danger)
    .setDisabled(true);

  const row = new ActionRowBuilder().addComponents(recoverButton);

  const msg = await channel.send({ embeds: [embed], components: [row] });

  // Enable recovery button after 20 seconds
  setTimeout(() => {
    recoverButton.setDisabled(false);
    msg.edit({ components: [row] }).catch(() => {});
  }, 20000);

  // Optionally reset their HP
  playerHP.set(key, { hp: 0, maxHP: getMaxHP(user.id, guild.id) });
}

function recoverInventory(userId) {
  const data = deadPlayers.get(userId);
  if (!data) return null;

  deadPlayers.delete(userId);
  return data.inventory;
}

function dropExpiredLoot() {
  const now = Date.now();
  for (const [userId, data] of deadPlayers.entries()) {
    if (data.expiresAt <= now) {
      deadPlayers.delete(userId);
      // Future: move value to shared pool or logs
    }
  }
}

module.exports = {
  getHP,
  setHP,
  reduceHP,
  handleDeath,
  recoverInventory,
  isDead,
  dropExpiredLoot,
  getMaxHP
};
