// economy/nhlGames.js
const axios = require('axios');

async function getTodayNHLGames() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const res = await axios.get(`https://api-web.nhle.com/v1/schedule/${dateStr}`);
    const games = res.data.games || [];

    return games.map(game => ({
      home: game.homeTeam.abbrev,
      visitor: game.awayTeam.abbrev
    }));
  } catch (err) {
    console.error("❌ Error fetching NHL games:", err.response?.status || err.message);
    return [];
  }
}

module.exports = { getTodayNHLGames };
