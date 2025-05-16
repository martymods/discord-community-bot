// commands/myreferral.js
const Referral = require('../models/referralModel');

module.exports = {
  name: 'myreferral',
  async execute(message) {
    const userId = message.author.id;
    let referral = await Referral.findOne({ userId });

    if (!referral) {
      const code = `krill${userId.slice(-4)}`;
      referral = await Referral.create({ userId, code });
    }

    message.reply(`👑 Your referral code is: **${referral.code}**\nShare this site: https://worldwide-krill.super.site/?ref=${referral.code}`);
  }
};
