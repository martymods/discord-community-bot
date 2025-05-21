// drugEnhance.js (NEW FILE)
const { getBalance, removeCash } = require('../economy/currency');
const { Inventory, removeItem } = require('../economy/inventory');
const DealerProfile = require('../economy/dealerProfileModel');
const { items } = require('../economy/items');

const ENHANCEMENT_COST = [0, 100, 250, 500, 1000, 2000];
const ENHANCEMENT_SUCCESS = [1.0, 0.85, 0.6, 0.4, 0.2, 0.1];

async function enhanceDrug(userId, guildId, drugId) {
  const profile = await DealerProfile.findOne({ userId, guildId });
  if (!profile) throw new Error('Profile not found.');

  if (!profile.enhancements) profile.enhancements = {};
  const currentLevel = profile.enhancements[drugId] || 0;
  if (currentLevel >= 5) throw new Error('Drug is already max level.');

  const cost = ENHANCEMENT_COST[currentLevel + 1];
  const chance = ENHANCEMENT_SUCCESS[currentLevel + 1];
  const hasCrystal = await Inventory.findOne({ userId, guildId });

  if (!hasCrystal || (hasCrystal.items.get('purity_crystal') || 0) <= 0)
    throw new Error('Missing required item: Purity Crystal');

  const balance = await getBalance(userId, guildId);
  if (balance < cost) throw new Error('Not enough DreamworldPoints.');

  await removeCash(userId, guildId, cost);
  await removeItem(userId, guildId, 'purity_crystal', 1);

  const success = Math.random() < chance;
  if (success) {
    profile.enhancements[drugId] = currentLevel + 1;
  } else if (Math.random() < 0.5 && currentLevel > 0) {
    profile.enhancements[drugId] = currentLevel - 1; // punish fail
  }

  profile.markModified('enhancements');
  await profile.save();

  return { success, level: profile.enhancements[drugId] };
}

module.exports = { enhanceDrug };
