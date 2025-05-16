// economy/sportsPredict.js
const { getTeamStats } = require('./nbaStats');

function buildRealTeamStats(games) {
  const teamStatsMap = {};

  for (const game of games) {
    const homeId = game.homeStats.id;
    const awayId = game.visitorStats.id;

    if (!teamStatsMap[game.home]) {
      teamStatsMap[game.home] = { ...getTeamStatsSync(homeId) };
    }
    if (!teamStatsMap[game.visitor]) {
      teamStatsMap[game.visitor] = { ...getTeamStatsSync(awayId) };
    }
  }

  return teamStatsMap;
}

function getTeamStatsSync(teamId) {
  // Ideally, cache these to avoid double API calls — but we simulate sync here
  const stats = require('./nbaStats');
  let output = {};

  stats.getTeamStats(teamId).then(data => {
    output = data;
  });

  return output;
}
