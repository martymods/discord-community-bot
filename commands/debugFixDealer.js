// commands/debugFixDealer.js

const DealerProfile = require('../economy/dealerProfileModel');

module.exports = {
  name: 'fixdealer',
  description: 'Fix dealer profile Map bug',
  async execute(message) {
    if (message.author.id !== message.guild.ownerId) {
      return message.reply("🚫 Only the server owner can run this.");
    }

    const profiles = await DealerProfile.find({});
    let fixedCount = 0;

    for (const p of profiles) {
      if (p.prices instanceof Map || typeof p.prices.get === 'function') {
        p.prices = Object.fromEntries(p.prices);
        await p.save();
        fixedCount++;
      }
    }

    message.reply(`✅ Fixed ${fixedCount} dealer profile(s).`);
  }
};
