const { DreamTokens, addTokens, removeTokens } = require('./dreamtokens');
const { recordWin, recordLoss } = require('./bettingStats');
const { logBet } = require('./bettingHistory');
const bets = new Map();
const { addToJackpot } = require('./jackpot');

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
    addToJackpot(amount);
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
      const { maybeTriggerJackpot } = require('./jackpotTrigger');
      await maybeTriggerJackpot(message.client, winner.user, message.guild.id);
      await recordWin(winner.user, message.guild.id, payout);
      await logBet(winner.user, message.guild.id, bet.event, winnerChoice, winner.amount, 'Win');
  
      const { sendWinDrama } = require('./dramaBetting');
      const user = await message.client.users.fetch(winner.user);
      await sendWinDrama(message.client, winner.user, payout);
  
      await message.channel.send({
        embeds: [{
          title: '💰 JACKPOT HIT 💰',
          color: 0xFFD700,
          thumbnail: { url: 'https://media.giphy.com/media/l0MYKDrJ0x1lYgMso/giphy.gif' },
          description: `🎉 <@${winner.user}> just WON **${payout} DreamTokens** betting on ${bet.event}!`,
          footer: { text: 'Dreamworld Betting System' },
          timestamp: new Date()
        }]
      });
    }
  
    for (const loser of losers) {
      await recordLoss(loser.user, message.guild.id, loser.amount);
      await logBet(loser.user, message.guild.id, bet.event, winnerChoice === 'A' ? 'B' : 'A', loser.amount, 'Loss');
    }
  
    message.channel.send(`🎉 Bet Resolved! Winners on ${winnerChoice === 'A' ? bet.optionA : bet.optionB} split ${potAfterFee} DreamTokens!`);
  
    bets.delete(betId);
  }
  
};
