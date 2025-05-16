// utils/registerReferral.js
const Referral = require('../models/referralModel');
const BettingStats = require('../economy/bettingStatsModel');

async function registerReferral(codeUsed, newUserId, guildId) {
  const referral = await Referral.findOne({ code: codeUsed });
  if (!referral) return false;

  referral.referrals += 1;
  referral.earned += 25; // 25 DreamTokens earned
  await referral.save();

  // Update BettingStats token total
  let stats = await BettingStats.findOne({ userId: referral.userId, guildId });
  if (!stats) {
    stats = await BettingStats.create({
      userId: referral.userId,
      guildId,
      tokensWon: 25
    });
  } else {
    stats.tokensWon += 25;
    await stats.save();
  }

  return true;
}

module.exports = { registerReferral };
