// systems/crimeTierSystem.js
const Currency = require('../economy/currency');

const tiers = {
  1: {
    name: 'Street Hustler',
    crimesRequired: 0,
    missions: ['Package Theft', 'Pickpocket', 'Vape Run'],
  },
  2: {
    name: 'Grifter',
    crimesRequired: 5,
    missions: ['Phone Scam', 'Crypto Rugpull', 'eBay Scheme'],
  },
  3: {
    name: 'Heist Planner',
    crimesRequired: 12,
    missions: ['Corner Store Robbery', 'Armored Truck', 'Art Gallery Heist'],
  },
  4: {
    name: 'Syndicate Agent',
    crimesRequired: 25,
    missions: ['Bank Hack', 'Prison Extraction', 'Political Blackmail'],
  }
};

function getTierData(tierLevel) {
  return tiers[tierLevel] || tiers[1];
}

async function incrementCrimeProgress(userId, guildId) {
  const profile = await Currency.findOne({ userId, guildId }) || new Currency({ userId, guildId });
  profile.crimesCompleted = (profile.crimesCompleted || 0) + 1;

  const nextTier = profile.crimeTier + 1;
  const nextTierData = tiers[nextTier];
  if (nextTierData && profile.crimesCompleted >= nextTierData.crimesRequired) {
    profile.crimeTier = nextTier;
  }

  await profile.save();
  return profile.crimeTier;
}

async function getCrimeTier(userId, guildId) {
  const profile = await Currency.findOne({ userId, guildId });
  return profile?.crimeTier || 1;
}

async function getAvailableCrimes(userId, guildId) {
  const tier = await getCrimeTier(userId, guildId);
  const data = getTierData(tier);
  return data.missions;
}

function getTierProgressBar(current, max) {
  const total = 10;
  const filled = Math.min(Math.floor((current / max) * total), total);
  return `Progress: ${'█'.repeat(filled)}${'░'.repeat(total - filled)} (${current}/${max})`;
}

module.exports = {
  tiers,
  getTierData,
  incrementCrimeProgress,
  getCrimeTier,
  getAvailableCrimes,
  getTierProgressBar
};
