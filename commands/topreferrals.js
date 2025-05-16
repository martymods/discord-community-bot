// commands/topreferrals.js
const Referral = require('../models/referralModel');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'topreferrals',
  description: 'Show the top referral leaders.',
  async execute(message) {
    const top = await Referral.find().sort({ referrals: -1 }).limit(10);
    if (!top.length) {
      return message.reply('No referral data found yet.');
    }

    const leaderboard = top.map((user, i) => {
      return `**${i + 1}.** <@${user.userId}> — ${user.referrals} invites | ${user.earned} 🎟️ tokens`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🏆 Top Referrers')
      .setDescription(leaderboard)
      .setColor('Gold');

    message.reply({ embeds: [embed] });
  }
};
