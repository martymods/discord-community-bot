// economy/nhlGames.js
const axios = require('axios');

async function getTodayNHLGames() {
  try {
    const res = await axios.get('https://api-web.nhle.com/v1/schedule');
    const games = res.data.games || [];

    const todayGames = games
      .filter(g => g.gameType === 'R' || g.gameType === 'P') // Regular or Playoff
      .map(g => ({
        home: g.homeTeam?.abbrev,
        visitor: g.awayTeam?.abbrev
      }));

    return todayGames;
  } catch (err) {
    console.error("❌ Error fetching NHL games:", err.message);
    return [];
  }
}

module.exports = { getTodayNHLGames };
