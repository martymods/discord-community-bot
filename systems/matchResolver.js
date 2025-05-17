const { getPSN } = require('./psnLinkManager');
const { fetchRecent2KMatch } = require('../scraper/psn2kScraper');
const { autoResolveMatch } = require('./autoResolve');
const { getActiveMatches } = require('./matchManager');
const PoolMatch = require('../models/poolMatch'); // ✅ Added for pool logic
const { addCash } = require('../economy/currency'); // ✅ Needed to pay winner

async function checkAndResolveAllMatches() {
  const matches = await getActiveMatches();

  for (const match of matches) {
    const { matchId, challengerId, opponentId, guildId } = match;

    const challengerPSN = await getPSN(challengerId, guildId);
    const opponentPSN = await getPSN(opponentId, guildId);

    if (!challengerPSN || !opponentPSN) {
      console.log(`❌ Missing PSN ID for match ${matchId}`);
      continue;
    }

    const [challengerMatches, opponentMatches] = await Promise.all([
      fetchRecent2KMatch(challengerPSN),
      fetchRecent2KMatch(opponentPSN)
    ]);

    const recentC = challengerMatches.find(m => m.title.includes('NBA 2K'));
    const recentO = opponentMatches.find(m => m.title.includes('NBA 2K'));

    if (!recentC || !recentO) continue;

    const cTime = new Date(recentC.earnedAt);
    const oTime = new Date(recentO.earnedAt);

    const winnerId = cTime > oTime ? challengerId : opponentId;

    // ✅ Resolve standard match
    await autoResolveMatch(matchId, winnerId);

    // ✅ Check for matching pool entry
    const pool = await PoolMatch.findOne({ matchId, status: 'matched' });
    if (pool) {
      const rakePercent = pool.rake || 0.1;
      const totalPot = [...pool.bets.values()].reduce((a, b) => a + b, 0);
      const rakeAmount = Math.floor(totalPot * rakePercent);
      const payout = totalPot - rakeAmount;

      await addCash(winnerId, guildId, payout);

      pool.status = 'resolved';
      pool.winnerId = winnerId;
      await pool.save();

      console.log(`🏆 Pool match ${matchId} resolved. Winner <@${winnerId}> gets ${payout}, rake: ${rakeAmount}`);
    }
  }
}

module.exports = { checkAndResolveAllMatches };
 
