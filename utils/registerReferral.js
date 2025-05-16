// utils/registerReferral.js
const Referral = require('../models/referralModel');
const { Currency } = require('../economy/currency');

async function registerReferral(codeUsed, newUserId, guildId) {
  const referral = await Referral.findOne({ code: codeUsed });
  if (!referral) return false;

  referral.referrals += 1;
  referral.earned += 100; // Reward per referral
  await referral.save();

  await Currency.addCash(referral.userId, guildId, 100);

  return true;
}

module.exports = { registerReferral };
