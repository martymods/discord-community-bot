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
      const teamId = team.id;
      const name = team.name;
      const abbrev = team.abbreviation;

      const stat = team.teamStats?.[0]?.splits?.[0]?.stat;
      if (!stat || !abbrev) {
        console.warn(`[MLBPREDICT][WARN] Missing stats or abbrev for: ${name}`);
        continue;
      }

      const avg = parseFloat(stat.battingAverage || 0);
      const obp = parseFloat(stat.onBasePercentage || 0);
      const slg = parseFloat(stat.sluggingPercentage || 0);
      const runs = parseFloat(stat.runs || 0);
      const gamesPlayed = parseFloat(stat.gamesPlayed || 1);
      const runsPerGame = runs / gamesPlayed;

      const powerScore =
        avg * 100 +
        obp * 100 +
        slg * 100 +
        runsPerGame * 10;

      const logo = `https://www.mlbstatic.com/team-logos/${teamId}.svg`;

      stats[name] = {
        fullName: name,
        avg,
        obp,
        slg,
        runsPerGame,
        powerScore,
        logo
      };

      console.log(`[MLB STATS] ${abbrev} (${name}) → Power: ${powerScore.toFixed(2)}`);
    }

    console.log('[MLBPREDICT][STATS] Loaded:', Object.keys(stats).length, 'teams');
    return stats;
  } catch (err) {
    console.error('❌ [MLBPREDICT][STATS ERROR]:', err.message);
    return {};
  }
}

module.exports = { buildMLBTeamStats };
