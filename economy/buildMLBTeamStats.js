const axios = require('axios');

async function buildMLBTeamStats() {
  try {
    console.log('[MLBPREDICT][STATS] Fetching team stats...');

    const url = 'https://statsapi.mlb.com/api/v1/teams/stats?season=2024&group=hitting,pitching&stats=season';
    const res = await axios.get(url);
    const teams = res.data?.stats?.[0]?.splits || [];

    const teamStats = {};

    for (const teamData of teams) {
      try {
        const team = teamData.team;
        const hitting = teamData.stat;

        const abbrev = team.abbreviation || team.triCode || team.teamTricode;
        if (!abbrev) {
          console.warn('[MLB STATS WARNING] Missing abbrev for:', team.name || team.fullName || JSON.stringify(team));
          continue;
        }

        const fullName = team.name || team.fullName || 'Unknown';
        const teamId = team.id;
        const logoUrl = `https://www.mlbstatic.com/team-logos/${teamId}.svg`;

        const avg = parseFloat(hitting.avg || 0);
        const obp = parseFloat(hitting.obp || 0);
        const slg = parseFloat(hitting.slg || 0);
        const runs = parseFloat(hitting.runs || 0);
        const gamesPlayed = parseFloat(hitting.gamesPlayed || 1);
        const runsPerGame = runs / gamesPlayed;

        const powerScore = (avg * 100) + (obp * 100) + (slg * 100) + (runsPerGame * 10);

        teamStats[abbrev] = {
          fullName,
          avg,
          obp,
          slg,
          runsPerGame,
          powerScore,
          logo: logoUrl
        };

        console.log(`[MLB STATS] ${abbrev} (${fullName}) → Power: ${powerScore.toFixed(2)}`);
      } catch (innerErr) {
        console.error('❌ [MLB STATS INNER ERROR]:', innerErr.message);
      }
    }

    console.log('[MLBPREDICT][STATS] Loaded team count:', Object.keys(teamStats).length);
    return teamStats;
  } catch (err) {
    console.error('❌ [MLBPREDICT][STATS ERROR]:', err.message);
    return {};
  }
}

module.exports = { buildMLBTeamStats };
