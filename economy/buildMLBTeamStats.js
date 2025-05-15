const axios = require('axios');

const TEAM_IDS = [
  108, 109, 110, 111, 112, 113, 114, 115, 116, 117,
  118, 119, 120, 121, 133, 134, 135, 136, 137, 138,
  139, 140, 141, 142, 143, 144, 145, 146, 147, 158
];

async function buildMLBTeamStats() {
  console.log('[MLBPREDICT][STATS] Fetching MLB team stats from individual endpoints...');

  const stats = {};

  for (const id of TEAM_IDS) {
    try {
      const teamRes = await axios.get(`https://statsapi.mlb.com/api/v1/teams/${id}`);
      const teamName = teamRes.data.teams?.[0]?.name || `Team ${id}`;

      const statRes = await axios.get(`https://statsapi.mlb.com/api/v1/teams/${id}/stats?stats=season&group=hitting`);
      const statObj = statRes.data.stats?.[0]?.splits?.[0]?.stat;

      if (!statObj) {
        console.warn(`[MLBPREDICT][WARN] No hitting stats for: ${teamName}`);
        continue;
      }

      const avg = parseFloat(statObj.avg || 0);
      const obp = parseFloat(statObj.obp || 0);
      const slg = parseFloat(statObj.slg || 0);
      const runs = parseFloat(statObj.runs || 0);
      const games = parseFloat(statObj.gamesPlayed || 1);
      const runsPerGame = runs / games;

      const powerScore = avg * 100 + obp * 100 + slg * 100 + runsPerGame * 10;

      stats[id] = {
        id,
        fullName: teamName,
        avg,
        obp,
        slg,
        runsPerGame,
        powerScore,
        logo: `https://www.mlbstatic.com/team-logos/${id}.svg`
      };

      console.log(`[MLB STATS] ✅ ${teamName} → Power: ${powerScore.toFixed(2)}`);

    } catch (err) {
      console.warn(`[MLBPREDICT][WARN] Failed to fetch stats for team ${id}: ${err.message}`);
    }
  }

  console.log('[MLBPREDICT][STATS] Final loaded team count:', Object.keys(stats).length);
  return stats;
}

module.exports = { buildMLBTeamStats };
