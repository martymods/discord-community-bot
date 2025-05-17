const Match = require('../models/matchModel');
const { Collection } = require('discord.js');

module.exports = {
  name: '2kleaderboard',
  async execute(message) {
    const matches = await Match.find({ status: 'resolved' });

    const totals = new Map();

    for (const match of matches) {
      const { winnerId, bet } = match;
      if (!totals.has(winnerId)) totals.set(winnerId, 0);
      totals.set(winnerId, totals.get(winnerId) + bet);
    }

    const top = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (!top.length) return message.reply("🏆 No completed matches yet.");

    const lines = await Promise.all(top.map(async ([userId, total], i) => {
      const user = await message.client.users.fetch(userId).catch(() => null);
      return `**${i + 1}.** ${user ? user.username : `User ${userId}`} — 💰 ${total} DreamTokens`;
    }));

    return message.channel.send({
      content: `🏀 **Top NBA2K Wager Winners**\n\n${lines.join('\n')}`
    });
  }
};
