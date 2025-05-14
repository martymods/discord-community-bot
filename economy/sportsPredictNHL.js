const axios = require('axios');

async function buildNHLTeamStats() {
  try {
    console.log('[NHLPREDICT][STATS] Fetching real NHL team stats...');

    const currentSeason = '20232024'; // You can make this dynamic if needed
    const res = await axios.get(`https://api.nhle.com/stats/rest/en/team/summary?cayenneExp=seasonId=${currentSeason}`);

    const teams = res.data?.data || [];
    const teamStats = {};

    for (const team of teams) {
      console.log('[NHL STATS DEBUG] Sample team object:', team);
      const abbrev = team.triCode || team.teamTricode || team.teamAbbrev || team.abbreviation;

      if (!abbrev) {
        console.warn('[NHL STATS WARNING] Missing abbrev for team:', team.teamFullName);
        continue;
      }

      const gamesPlayed = team.gamesPlayed;
      const wins = team.wins;
      const goalsFor = team.goalsFor / gamesPlayed;
      const goalsAgainst = team.goalsAgainst / gamesPlayed;
      const winPct = wins / gamesPlayed;
      const powerScore = winPct * 100 + goalsFor - goalsAgainst;

      teamStats[abbrev] = {
        winPct,
        goalsFor,
        goalsAgainst,
        powerScore,
        logo: team.teamLogo?.default
      };
    }

    console.log('[NHLPREDICT][STATS] Team stats loaded for:', Object.keys(teamStats));
    return teamStats;
  } catch (err) {
    console.error('❌ [NHLPREDICT][STATS ERROR]:', err.message);
    return {};
  }
}

module.exports = { buildNHLTeamStats };
