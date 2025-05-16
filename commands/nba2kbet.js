const { getBalance, removeCash } = require('../economy/currency');
const { createMatch } = require('../systems/matchManager');

module.exports = {
  name: 'nba2kbet',
  async execute(message, args) {
    const challenger = message.author;
    const opponent = message.mentions.users.first();
    const guildId = message.guild.id;
    const bet = parseInt(args[1]);

    if (!opponent || isNaN(bet) || bet <= 0) {
      return message.reply("⚠️ Usage: `!nba2kbet @user 100`");
    }

    const challengerBalance = await getBalance(challenger.id, guildId);
    const opponentBalance = await getBalance(opponent.id, guildId);

    if (challengerBalance < bet || opponentBalance < bet) {
      return message.reply("💸 Both players must have enough DreamTokens.");
    }

    // Lock tokens now
    await removeCash(challenger.id, guildId, bet);
    await removeCash(opponent.id, guildId, bet);

    const match = await createMatch({
      guildId,
      challengerId: challenger.id,
      opponentId: opponent.id,
      bet
    });

    return message.channel.send(
      `🏀 Wager Match Created!\n` +
      `💰 Bet: **${bet} DreamTokens**\n` +
      `🎮 Players: <@${challenger.id}> vs <@${opponent.id}>\n` +
      `📡 Awaiting PSN match results... Match ID: \`${match.matchId}\``
    );
  }
};
