// 📦 statUtils.js (database persistent version)
const PlayerStats = require('./economy/playerStatsModel');
const { getHP, setHP, getMaxHP } = require('./economy/deathSystem');

async function getPlayerStats(userId, guildId) {
    let stats = await PlayerStats.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { strength: 0, agility: 0, grit: 0, luck: 0, intellect: 0, vitality: 0, points: 0 } },
        { upsert: true, new: true }
      );
      
  return stats;
}

async function addStatPoint(userId, guildId, stat) {
  const stats = await getPlayerStats(userId, guildId);
  if (stats.points > 0 && typeof stats[stat] === 'number') {
    stats[stat]++;
    stats.points--;
    await stats.save();
    await applyStatPerks(userId, guildId);
    return true;
  }
  return false;
}

async function spendStatPoint(userId, guildId, statName) {
  const stats = await getPlayerStats(userId, guildId);
  if (stats.points > 0 && typeof stats[statName] === 'number') {
    stats[statName]++;
    stats.points--;
    await stats.save();
    await applyStatPerks(userId, guildId);
    return true;
  }
  return false;
}

async function grantStatPoints(userId, guildId, amount = 1) {
  const stats = await getPlayerStats(userId, guildId);
  stats.points += amount;
  await stats.save();
  await applyStatPerks(userId, guildId);
}

async function syncStatPointsWithLevel(userId, guildId, level) {
  const stats = await getPlayerStats(userId, guildId);
  const used = stats.strength + stats.agility + stats.grit + stats.luck + stats.intellect + stats.vitality;
  const missing = level - used - stats.points;
  if (missing > 0) {
    stats.points += missing;
    await stats.save();
    await applyStatPerks(userId, guildId);
  }
}

async function resetStats(userId, guildId) {
  const stats = await getPlayerStats(userId, guildId);
  stats.points += stats.strength + stats.agility + stats.grit + stats.luck + stats.intellect + stats.vitality;
  stats.strength = 0;
  stats.agility = 0;
  stats.grit = 0;
  stats.luck = 0;
  stats.intellect = 0;
  stats.vitality = 0;
  await stats.save();
  await applyStatPerks(userId, guildId);
}

async function getStat(userId, guildId, stat) {
  const stats = await getPlayerStats(userId, guildId);
  return stats[stat] || 0;
}

async function applyStatPerks(userId, guildId) {
  const stats = await getPlayerStats(userId, guildId);

  // ❤️ Max HP Scaling
  const maxHP = getMaxHP(stats);
  const current = getHP(userId);
  setHP(userId, current.hp, maxHP);

  // 🔋 XP Multiplier
  global.xpMultipliers = global.xpMultipliers || new Map();
  const xpBoost = 1 + (stats.intellect * 0.025);
  global.xpMultipliers.set(userId, xpBoost);

  // 🍀 Loot Luck
  global.lootLuck = global.lootLuck || new Map();
  global.lootLuck.set(userId, stats.luck * 2);

  // 🦶 Dodge Chance
  global.dodgeChance = global.dodgeChance || new Map();
  global.dodgeChance.set(userId, stats.agility * 2);

  // 💥 Cooldown Boost
  global.cooldownBoost = global.cooldownBoost || new Map();
  global.cooldownBoost.set(userId, stats.grit * 0.5);

  // 💪 Payout Bonus
  global.payoutBonus = global.payoutBonus || new Map();
  global.payoutBonus.set(userId, 1 + (stats.strength * 0.03));

  // ❤️ Stash Bonus
  const baseStash = 30;
  const bonusStash = Math.floor(stats.vitality / 2);
  global.stashCapBonus = global.stashCapBonus || new Map();
  global.stashCapBonus.set(userId, baseStash + bonusStash);
}

module.exports = {
  getPlayerStats,
  addStatPoint,
  grantStatPoints,
  getStat,
  resetStats,
  spendStatPoint,
  syncStatPointsWithLevel,
  applyStatPerks
};
