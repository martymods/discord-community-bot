const { getPSN } = require('./psnLinkManager');
const { fetchRecent2KMatch } = require('../scraper/psn2kScraper');
const { autoResolveMatch } = require('./autoResolve');
const { getActiveMatches } = require('./matchManager');

async function checkAndResolveAllMatches() {
  const matches = getActiveMatches();

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

    // Simple logic: winner has most recent win logged
    const recentC = challengerMatches.find(m => m.title.includes('NBA 2K'));
    const recentO = opponentMatches.find(m => m.title.includes('NBA 2K'));

    if (!recentC || !recentO) continue;

    const cTime = new Date(recentC.earnedAt);
    const oTime = new Date(recentO.earnedAt);

    const winnerId = cTime > oTime ? challengerId : opponentId;

    await autoResolveMatch(matchId, winnerId);
  }
}

module.exports = { checkAndResolveAllMatches };
 