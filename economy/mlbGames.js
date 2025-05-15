// 📁 /economy/mlbGames.js
const axios = require('axios');

async function getTodayMLBGames() {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}`;

  try {
    const res = await axios.get(url);
    const games = res.data.dates[0]?.games || [];

    return games.map(g => ({
      home: g.teams.home.team.id,
      visitor: g.teams.away.team.id
    }));
  } catch (err) {
    console.error('[MLBPREDICT][GAMES ERROR]', err.message);
    return [];
  }
}

module.exports = { getTodayMLBGames };
