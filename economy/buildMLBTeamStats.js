const axios = require('axios');

async function buildMLBTeamStats() {
  try {
    console.log('[MLBPREDICT][STATS] Fetching team stats...');

    const url = 'https://statsapi.mlb.com/api/v1/teams/stats?season=2024&group=hitting,pitching&stats=season';
    const res = await axios.get(url);
    const teams = res.data?.stats?.[0]?.splits || [];

    const teamStats = {};

    const officialMLBTeamIds = [
      108, 109, 110, 111, 112, 113, 114, 115, 116, 117,
      118, 119, 120, 121, 133, 134, 135, 136, 137, 138,
      139, 140, 141, 142, 143, 144, 145, 146, 147, 158
    ];

    for (const teamData of teams) {
      const team = teamData.team;
      const teamId = team?.id;

      if (!officialMLBTeamIds.includes(teamId)) {
        console.warn('[MLB STATS WARNING] Skipping non-MLB team:', team?.name);
        continue;
      }

      const abbrev = team.abbreviation || team.triCode || team.teamTricode;
      if (!abbrev) {
        console.warn('[MLB STATS WARNING] Missing abbrev for:', team.name);
        continue;
      }

      const hitting = teamData.stat;
      const avg = parseFloat(hitting.avg || 0);
      const obp = parseFloat(hitting.obp || 0);
      const slg = parseFloat(hitting.slg || 0);
      const runs = parseFloat(hitting.runs || 0);
      const gamesPlayed = parseFloat(hitting.gamesPlayed || 1);
      const runsPerGame = runs / gamesPlayed;

      const powerScore = (avg * 100) + (obp * 100) + (slg * 100) + (runsPerGame * 10);
      const logoUrl = `https://www.mlbstatic.com/team-logos/${teamId}.svg`;

      teamStats[abbrev] = {
        fullName: team.name,
        avg,
        obp,
        slg,
        runsPerGame,
        powerScore,
        logo: logoUrl
      };

      console.log(`[MLB STATS] ${abbrev} (${team.name}) → Power: ${powerScore.toFixed(2)}`);
    }

    console.log(`[MLBPREDICT][STATS] Loaded team count: ${Object.keys(teamStats).length}`);
    return teamStats;
  } catch (err) {
    console.error('❌ [MLBPREDICT][STATS ERROR]:', err.message);
    return {};
  }
}

module.exports = { buildMLBTeamStats };
