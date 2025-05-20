// /economy/deathSystem.js

const mongoose = require('mongoose');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const PlayerStats = require('./playerStatsModel');
const Inventory = require('./inventory');
const Health = mongoose.model('Health', new mongoose.Schema({
  userId: String,
  guildId: String,
  hp: { type: Number, default: 100 },
  maxHp: { type: Number, default: 100 }
}).index({ userId: 1, guildId: 1 }, { unique: true }));

const deadPlayers = new Map(); // stores { userId: { inventory, expiresAt } }

// ❤️ Max HP = 100 + 10 * vitality
function getMaxHP(stats) {
  return 100 + (stats.vitality || 0) * 10;
}

async function getHP(userId, guildId) {
  let data = await Health.findOne({ userId, guildId });
  if (!data) data = await Health.create({ userId, guildId });
  return data;
}

async function setHP(userId, hp, maxHp = null, guildId) {
  let record = await Health.findOne({ userId, guildId });
  if (!record) record = await Health.create({ userId, guildId });
  record.hp = Math.min(hp, record.maxHp);
  if (maxHp !== null) record.maxHp = maxHp;
  await record.save();
  return record;
}

async function applyDamage(userId, guildId, amount) {
  const hpData = await getHP(userId, guildId);
  hpData.hp = Math.max(0, hpData.hp - amount);
  await hpData.save();
  return hpData.hp;
}

async function resetHP(userId, guildId) {
  const stats = await PlayerStats.findOne({ userId, guildId });
  const maxHp = getMaxHP(stats || {});
  await Health.findOneAndUpdate(
    { userId, guildId },
    { hp: maxHp, maxHp },
    { upsert: true }
  );
}

async function isDead(userId, guildId) {
  const hp = await getHP(userId, guildId);
  return hp.hp <= 0;
}

async function handleDeath(user, guild, channel) {
  const userId = user.id;
  const guildId = guild.id;
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

  const inv = await Inventory.getInventory(userId, guildId);
  deadPlayers.set(userId, { inventory: inv, expiresAt });

  const embed = new EmbedBuilder()
    .setTitle(`☠️ ${user.username} Has Died!`)
    .setDescription(`They dropped everything... Loot expires in **10 minutes**.`)
    .setThumbnail(user.displayAvatarURL())
    .setImage('https://example.com/lootdrop.png') // TODO: Replace this image
    .setFooter({ text: 'Use the button below to try to recover your items...' });

  const recoverButton = new ButtonBuilder()
    .setCustomId(`recover_items_${userId}`)
    .setLabel(`Recover Items (wait 20s)`)
    .setStyle(ButtonStyle.Danger)
    .setDisabled(true);

  const row = new ActionRowBuilder().addComponents(recoverButton);
  const msg = await channel.send({ embeds: [embed], components: [row] });

  setTimeout(() => {
    recoverButton.setDisabled(false);
    msg.edit({ components: [row] }).catch(() => {});
  }, 20000);

  // Zero out HP
  await setHP(userId, 0, null, guildId);
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
    }
  }
}

module.exports = {
  getHP,
  setHP,
  getMaxHP,
  applyDamage,
  resetHP,
  isDead,
  handleDeath,
  recoverInventory,
  dropExpiredLoot,
  Health
};
