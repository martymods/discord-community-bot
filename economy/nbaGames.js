const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const recentGames = new Map(); // gameId → { home, visitor }

const RAPID_API_KEY = '36c5da5fe5mshe18e4122d0e413p12cf89jsnbd5be527669f';

async function getTodayGames() {
  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await fetch(`https://api-basketball.p.rapidapi.com/games?date=${today}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': 'api-basketball.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API returned status ${response.status}: ${text}`);
    }

    const data = await response.json();
    const games = data.response || [];

    return games.map(game => {
      const id = String(game.id);
      const home = game.teams.home.name;
      const visitor = game.teams.away.name;
      const status = game.status.long;
      const date = game.date;

      recentGames.set(id, { home, visitor });

      return { id, home, visitor, status, date };
    });

  } catch (error) {
    console.error("❌ Error fetching NBA games:", error.message);
    return [];
  }
}

module.exports = {
  getTodayGames,
  recentGames
};

