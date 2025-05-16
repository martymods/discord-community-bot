const { getPSN } = require('../systems/psnLinkManager');
const { getMatchByPlayer } = require('../systems/matchManager');

module.exports = {
  name: 'mypsn',
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    const psnId = await getPSN(userId, guildId);
    if (!psnId) {
      return message.reply('❌ You haven’t linked a PSN ID yet. Use `!linkpsn your_PSN`');
    }

    const match = await getMatchByPlayer(userId);

    let matchInfo = 'No active NBA2K wagers.';
    if (match) {
      const opponentId = match.challengerId === userId ? match.opponentId : match.challengerId;
      matchInfo = `🎮 Currently in a match vs <@${opponentId}> for **${match.bet} DreamTokens**.\nMatch ID: \`${match.matchId}\``;
    }

    return message.channel.send({
      content: `🎮 PSN Linked: **${psnId}**\n\n${matchInfo}`
    });
  }
};
