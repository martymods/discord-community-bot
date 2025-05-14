const axios = require('axios');

async function buildNHLTeamStats() {
  try {
    console.log('[NHLPREDICT][STATS] Fetching real NHL team stats...');

    const res = await axios.get('https://api.nhle.com/stats/rest/en/team/summary?isAggregate=false&isGame=false&sort=teamFullName&start=0&limit=100');
    const teams = res.data?.data || [];

    const teamStats = {};

for (const team of teams) {
    console.log('[NHL STATS DEBUG] Sample team object:', team);
const abbrev = team.teamAbbrev || team.teamTricode;

  if (!abbrev) {
    console.warn('[NHL STATS WARNING] Missing abbrev for team:', team.teamName);
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
