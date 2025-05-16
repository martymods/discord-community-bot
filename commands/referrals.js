// commands/referrals.js
const Referral = require('../models/referralModel');

module.exports = {
  name: 'referrals',
  async execute(message) {
    const referral = await Referral.findOne({ userId: message.author.id });
    if (!referral) {
      return message.reply('❌ You don’t have a referral code yet. Use `!myreferral` to get one.');
    }

    message.reply(`📊 Referrals: **${referral.referrals}**\n💰 Earned: **${referral.earned} DreamworldPoints**`);
  }
};
