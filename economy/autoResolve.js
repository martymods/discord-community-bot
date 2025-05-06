const { getTodayGames, recentGames } = require('./nbaGames');
const { bets } = require('./betting');
const { addTokens } = require('./dreamtokens');
const { recordWin, recordLoss } = require('./bettingStats');
const { sendWinDrama, sendLossDrama } = require('./dramaBetting');
const { maybeTriggerJackpot } = require('./jackpotTrigger');

async function resolveFinishedGames(client) {
  const games = await getTodayGames();

  for (const game of games) {
    if (game.status !== 'Finished') continue;

    const bet = bets.get(String(game.id));
    if (!bet) continue; // no bet
    if (bet.resolved) continue; // already resolved

    const winner = game.scores.home.total > game.scores.away.total ? 'A' : 'B';
    const winners = winner === 'A' ? bet.betsA : bet.betsB;
    const losers = winner === 'A' ? bet.betsB : bet.betsA;

    const potAfterFee = bet.pot * 0.9;
    const totalWinnerBet = winners.reduce((a, b) => a + b.amount, 0);

    for (const winner of winners) {
      const payout = Math.floor((winner.amount / totalWinnerBet) * potAfterFee);
      await addTokens(winner.user, bet.guildId, payout);
      await recordWin(winner.user, bet.guildId, payout);
      sendWinDrama(client, winner.user, payout);
      await maybeTriggerJackpot(client, winner.user, bet.guildId);
    }

    for (const loser of losers) {
      await recordLoss(loser.user, bet.guildId, loser.amount);
      sendLossDrama(client, loser.user);
    }

    bets.delete(String(game.id)); // clean it
  }
}

module.exports = { resolveFinishedGames };
