// 📁 /economy/mlbGames.js
const axios = require('axios');

async function getTodayMLBGames() {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}`;

  try {
    const res = await axios.get(url);
    const games = res.data.dates[0]?.games || [];

    return games.map(g => ({
      home: g.teams.home.team.name,
      visitor: g.teams.away.team.name
    }));
  } catch (err) {
    console.error('[MLBPREDICT][GAMES ERROR]', err.message);
    return [];
  }
}

module.exports = { getTodayMLBGames };

// 📁 /economy/buildMLBTeamStats.js
const axios = require('axios');

async function buildMLBTeamStats() {
  console.log('[MLBPREDICT][STATS] Fetching MLB team stats...');
  const url = 'https://statsapi.mlb.com/api/v1/teams?sportId=1&season=2024&hydrate=teamStats(type=season)';

  try {
    const res = await axios.get(url);
    const teams = res.data.teams || [];

    const stats = {};
    for (const team of teams) {
      const name = team.name;
      const s = team.teamStats?.[0]?.splits?.[0]?.stat;
      if (!s) continue;

      const winPct = parseFloat(s.winningPercentage || 0);
      const runsPerGame = parseFloat(s.runsPerGame || 0);
      const runsAllowed = parseFloat(s.runsAllowedPerGame || 0);
      const homeRuns = parseFloat(s.homeRuns || 0);
      const teamERA = parseFloat(s.era || 0);
      const strikeouts = parseFloat(s.strikeOuts || 0);

      const powerScore =
        winPct * 100 +
        (runsPerGame - runsAllowed) * 2 +
        (strikeouts / 100) -
        teamERA +
        homeRuns / 10;

      stats[name] = {
        winPct,
        runsPerGame,
        runsAllowed,
        homeRuns,
        teamERA,
        strikeouts,
        powerScore,
        fullName: name
      };
    }

    console.log('[MLBPREDICT][STATS] Loaded:', Object.keys(stats).length, 'teams');
    return stats;
  } catch (err) {
    console.error('❌ [MLBPREDICT][STATS ERROR]:', err.message);
    return {};
  }
}

module.exports = { buildMLBTeamStats };
