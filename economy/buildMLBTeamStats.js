
const axios = require('axios');

async function buildMLBTeamStats() {
  try {
    console.log('[MLBPREDICT][STATS] Fetching team list...');

    // Step 1: Get all MLB teams (sportId 1 = MLB)
    const teamRes = await axios.get('https://statsapi.mlb.com/api/v1/teams?sportId=1');
    const teams = teamRes.data.teams;

    const teamStats = {};

    for (const team of teams) {
      const teamId = team.id;
      const teamName = team.name;
      const abbrev = team.abbreviation || team.triCode;

      if (!abbrev) {
        console.warn('[MLB STATS WARNING] Missing abbrev for:', teamName);
        continue;
      }

      console.log(`[MLB STATS] Fetching stats for: ${abbrev} (${teamName})`);

      const statsUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?season=2024&group=hitting&stats=season`;
      const statsRes = await axios.get(statsUrl);
      const hitting = statsRes.data.stats?.[0]?.splits?.[0]?.stat;

      if (!hitting) {
        console.warn('[MLB STATS WARNING] No hitting stats for:', teamName);
        continue;
      }

      const avg = parseFloat(hitting.avg || 0);
      const obp = parseFloat(hitting.obp || 0);
      const slg = parseFloat(hitting.slg || 0);
      const runs = parseFloat(hitting.runs || 0);
      const gamesPlayed = parseFloat(hitting.gamesPlayed || 1);
      const runsPerGame = runs / gamesPlayed;

      const powerScore = (avg * 100) + (obp * 100) + (slg * 100) + (runsPerGame * 10);
      const logoUrl = `https://www.mlbstatic.com/team-logos/${teamId}.svg`;

      teamStats[abbrev] = {
        fullName: teamName,
        avg,
        obp,
        slg,
        runsPerGame,
        powerScore,
        logo: logoUrl
      };

      console.log(`[MLB STATS] ${abbrev} (${teamName}) → Power: ${powerScore.toFixed(2)}`);
    }

    console.log(`[MLBPREDICT][STATS] Loaded team count: ${Object.keys(teamStats).length}`);
    return teamStats;
  } catch (err) {
    console.error('❌ [MLBPREDICT][STATS ERROR]:', err.message);
    return {};
  }
}

module.exports = { buildMLBTeamStats };
