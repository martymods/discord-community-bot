// /utils/boxUtils.js

const tierThreshold = {
    common: 10,
    uncommon: 15,
    rare: 20,
    epic: 25,
    legendary: Infinity // max tier
  };
  
  // Check if user should level up
  function shouldUpgradeBox(currentTier, xp) {
    return xp >= (tierThreshold[currentTier] || 10);
  }
  
  // Get the next tier
  function getNextTier(currentTier) {
    const tiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const index = tiers.indexOf(currentTier);
    return index >= 0 && index < tiers.length - 1 ? tiers[index + 1] : null;
  }
  
  module.exports = {
    shouldUpgradeBox,
    getNextTier,
    tierThreshold
  };
  