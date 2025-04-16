const { getTodayGames } = require('./nbaGames');
const { sendToSportsIntel } = require('../utils/sportsIntelHelper');

function simpleLogicPredict(game) {
  const teamA = game.visitor;
  const teamB = game.home;

  // Simulate fake stats for now — replace with real API stats when we extend
  const stats = {
    [teamA]: {
      winStreak: Math.floor(Math.random() * 5),
      awayWinRate: Math.random(),
      pointsPerGame: 100 + Math.floor(Math.random() * 20)
    },
    [teamB]: {
      winStreak: Math.floor(Math.random() * 5),
      homeWinRate: Math.random(),
      pointsPerGame: 100 + Math.floor(Math.random() * 20)
    }
  };

  const teamAScore = stats[teamA].winStreak * 2 + stats[teamA].pointsPerGame;
  const teamBScore = stats[teamB].winStreak * 2 + stats[teamB].pointsPerGame + 5; // +5 for home advantage

  return teamAScore > teamBScore ? teamA : teamB;
}

async function runDailyPredictions(client) {
  const games = await getTodayGames();
  for (const game of games) {
    const predicted = simpleLogicPredict(game);
    sendToSportsIntel(client, game.guildId || client.guilds.cache.first().id,
      `📊 Prediction for **${game.visitor} @ ${game.home}**: **${predicted}** will win.`);
  }
}

module.exports = {
  simpleLogicPredict,
  runDailyPredictions
};
