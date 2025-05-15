const axios = require('axios');

async function buildMLBTeamStats() {
  console.log('[MLBPREDICT][STATS] Fetching MLB team stats...');
  const url = 'https://statsapi.mlb.com/api/v1/teams?sportId=1&season=2024&hydrate=teamStats(type=season)';

  try {
    const res = await axios.get(url);
    const teams = res.data.teams || [];

    const stats = {};
    for (const team of teams) {
      const id = team.id;
      const name = team.name;
      const abbrev = team.abbreviation || team.teamCode || team.triCode;
      const s = team.teamStats?.[0]?.splits?.[0]?.stat;

      if (!s || !abbrev) {
        console.warn(`[MLBPREDICT][WARN] Missing stats or abbrev for: ${name}`);
        continue;
      }

      const avg = parseFloat(s.battingAvg || 0);
      const obp = parseFloat(s.onBasePct || 0);
      const slg = parseFloat(s.sluggingPct || 0);
      const runs = parseFloat(s.runsPerGame || 0);

      const powerScore =
        avg * 100 +
        obp * 100 +
        slg * 100 +
        runs * 10;

      stats[id] = {
        id,
        fullName: name,
        abbreviation: abbrev,
        avg,
        obp,
        slg,
        runsPerGame: runs,
        powerScore,
        logo: `https://www.mlbstatic.com/team-logos/${id}.svg`
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
