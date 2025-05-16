// economy/sportsPredict.js
const { getTeamStats } = require('./nbaStats');

async function buildRealTeamStats(games) {
  const teamStatsMap = {};

  for (const game of games) {
    const homeId = game.homeStats.id;
    const awayId = game.visitorStats.id;

    if (!teamStatsMap[game.home]) {
      const stats = await getTeamStats(homeId);
      teamStatsMap[game.home] = stats;
      console.log(`📈 Loaded stats for ${game.home}:`, stats);
    }

    if (!teamStatsMap[game.visitor]) {
      const stats = await getTeamStats(awayId);
      teamStatsMap[game.visitor] = stats;
      console.log(`📈 Loaded stats for ${game.visitor}:`, stats);
    }
  }

  return teamStatsMap;
}

module.exports = { buildRealTeamStats };
