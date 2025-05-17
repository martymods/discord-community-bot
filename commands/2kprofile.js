const { getPSN } = require('../systems/psnLinkManager');
const Match = require('../models/matchModel'); // We'll create this below

module.exports = {
  name: '2kprofile',
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    const psn = await getPSN(userId, guildId);
    if (!psn) return message.reply("❌ You haven't linked a PSN. Use `!linkpsn your_psn`");

    const allMatches = await Match.find({
      status: 'resolved',
      $or: [{ challengerId: userId }, { opponentId: userId }]
    });

    const wins = allMatches.filter(m => m.winnerId === userId).length;
    const losses = allMatches.length - wins;
    const winRate = allMatches.length ? ((wins / allMatches.length) * 100).toFixed(1) : 0;

    return message.channel.send(
      `📊 **NBA2K Profile** for <@${userId}> (PSN: **${psn}**)\n` +
      `🏆 Wins: ${wins}\n❌ Losses: ${losses}\n📈 Win Rate: ${winRate}%\n🎮 Total Matches: ${allMatches.length}`
    );
  }
};
