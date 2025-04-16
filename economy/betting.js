const { DreamTokens, addTokens, removeTokens } = require('./dreamtokens');
const { recordWin, recordLoss } = require('./bettingStats');
const bets = new Map();

module.exports = {
  bets, // Store active bets

  createBet(message, event, optionA, optionB, minBet = 100) {
    const betId = `${Date.now()}`;

    bets.set(betId, {
      event,
      optionA,
      optionB,
      minBet,
      pot: 0,
      betsA: [],
      betsB: []
    });

    message.channel.send(`📢 New Bet Open: **${event}**
Options:
A → ${optionA}
B → ${optionB}
Minimum Bet: ${minBet} DreamTokens

Place your bet:
!bet ${betId} A amount
!bet ${betId} B amount`);
  },

  async placeBet(message, betId, choice, amount) {
    const bet = bets.get(betId);
    if (!bet) return message.reply("Invalid Bet.");

    if (amount < bet.minBet) return message.reply(`Minimum bet is ${bet.minBet} DreamTokens.`);

    const tokens = await DreamTokens.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!tokens || tokens.tokens < amount) return message.reply("Not enough DreamTokens.");

    await removeTokens(message.author.id, message.guild.id, amount);

    bet.pot += amount;
    if (choice === 'A') bet.betsA.push({ user: message.author.id, amount });
    if (choice === 'B') bet.betsB.push({ user: message.author.id, amount });

    message.reply(`Bet Placed on ${choice === 'A' ? bet.optionA : bet.optionB} for ${amount} DreamTokens.`);
  },

  async resolveBet(message, betId, winnerChoice) {
    const bet = bets.get(betId);
    if (!bet) return message.reply("Invalid Bet.");

    const winners = winnerChoice === 'A' ? bet.betsA : bet.betsB;
    const losers = winnerChoice === 'A' ? bet.betsB : bet.betsA;

    if (!winners.length) {
      message.channel.send("Nobody won. House keeps the pot.");
      bets.delete(betId);
      return;
    }

    const potAfterFee = bet.pot * 0.9;
    const totalWinnerBet = winners.reduce((a, b) => a + b.amount, 0);

    for (const winner of winners) {
      const payout = Math.floor((winner.amount / totalWinnerBet) * potAfterFee);
      await addTokens(winner.user, message.guild.id, payout);
      await recordWin(winner.user, message.guild.id, payout);
    }

    for (const loser of losers) {
      await recordLoss(loser.user, message.guild.id, loser.amount);
    }

    message.channel.send(`🎉 Bet Resolved! Winners on ${winnerChoice === 'A' ? bet.optionA : bet.optionB} split ${potAfterFee} DreamTokens!`);

    bets.delete(betId);
  }
};
