const { resolveMatch } = require('./matchManager');
const { addCash } = require('../economy/currency');

async function autoResolveMatch(matchId, winnerId) {
  const match = resolveMatch(matchId, winnerId);
  if (!match) return console.log(`❌ Match ${matchId} not found or already resolved.`);

  const loserId = match.challengerId === winnerId ? match.opponentId : match.challengerId;
  const payout = match.bet * 2;

  await addCash(winnerId, match.guildId, payout);

  console.log(`🏆 Match ${matchId} resolved. Winner <@${winnerId}> received ${payout} DreamTokens.`);
}

module.exports = { autoResolveMatch };
