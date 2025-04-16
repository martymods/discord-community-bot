const { getTodayGames } = require('./nbaGames');
const { sendToSportsIntel } = require('../utils/sportsIntelHelper');

// 🧠 Build real team stats from today's game list
async function buildRealTeamStats(games) {
  const stats = {};

  for (const game of games) {
    const home = game.home;
    const away = game.visitor;
    const homeScore = game.scores.home.total;
    const awayScore = game.scores.away.total;

    if (!stats[home]) stats[home] = { wins: 0, games: 0, totalPoints: 0, homeWins: 0, homeGames: 0 };
    if (!stats[away]) stats[away] = { wins: 0, games: 0, totalPoints: 0, awayWins: 0, awayGames: 0 };

    // Total points
    stats[home].totalPoints += homeScore;
    stats[home].games++;
    stats[home].homeGames++;

    stats[away].totalPoints += awayScore;
    stats[away].games++;
    stats[away].awayGames++;

    // Win tracking
    if (homeScore > awayScore) {
      stats[home].wins++;
      stats[home].homeWins++;
    } else {
      stats[away].wins++;
      stats[away].awayWins++;
    }
  }

  // Calculate averages
  for (const team in stats) {
    const s = stats[team];
    s.pointsPerGame = s.totalPoints / s.games;
    s.winRate = s.wins / s.games;
    s.homeWinRate = s.homeGames ? s.homeWins / s.homeGames : 0;
    s.awayWinRate = s.awayGames ? s.awayWins / s.awayGames : 0;
  }

  return stats;
}

// 📊 Predict winner using updated stats
function simpleLogicPredict(game, stats) {
  const teamA = game.visitor;
  const teamB = game.home;

  if (!stats[teamA] || !stats[teamB]) return null;

  const scoreA =
    (stats[teamA].winRate || 0) * 2 +
    (stats[teamA].pointsPerGame || 0) * 1 +
    (stats[teamA].awayWinRate || 0) * 1.5;

  const scoreB =
    (stats[teamB].winRate || 0) * 2 +
    (stats[teamB].pointsPerGame || 0) * 1 +
    (stats[teamB].homeWinRate || 0) * 1.5;

  return scoreA > scoreB ? teamA : teamB;
}

// 🔁 Auto run prediction once daily
async function runDailyPredictions(client) {
  const games = await getTodayGames();
  const stats = await buildRealTeamStats(games);

  for (const game of games) {
    const predicted = simpleLogicPredict(game, stats);
    if (predicted) {
      sendToSportsIntel(
        client,
        game.guildId || client.guilds.cache.first().id,
        `📊 Prediction for **${game.visitor} @ ${game.home}**: **${predicted}** will win.`
      );
    }
  }
}

module.exports = {
  simpleLogicPredict,
  runDailyPredictions,
  buildRealTeamStats
};
