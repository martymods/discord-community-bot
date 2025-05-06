const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const recentGames = new Map(); // gameId → { home, visitor }

const API_KEY = '36c5da5fe5mshe18e4122dd0e413p12cf89jsnbd5be527669f';

async function getTodayGames() {
  const today = new Date().toISOString().slice(0, 10);
  const url = `https://api-basketball.p.rapidapi.com/games?date=${today}&league=12&season=2024-2025`;

  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': 'api-basketball.p.rapidapi.com'
    }
  };

  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      throw new Error(`API returned status ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    if (!json.response || json.response.length === 0) {
      console.log("🟡 No games found for today.");
      return [];
    }

    return json.response.map(game => {
      const home = game.teams.home.name;
      const visitor = game.teams.away.name;

      // Mock stats until real ones are pulled from API
      const homeStats = {
        wins: Math.floor(Math.random() * 50) + 10,
        losses: Math.floor(Math.random() * 30) + 10,
        pointsPerGame: Math.random() * 30 + 90,
        pointsAllowed: Math.random() * 15 + 95
      };

      const visitorStats = {
        wins: Math.floor(Math.random() * 50) + 10,
        losses: Math.floor(Math.random() * 30) + 10,
        pointsPerGame: Math.random() * 30 + 90,
        pointsAllowed: Math.random() * 15 + 95
      };

      recentGames.set(String(game.id), { home, visitor });

      return {
        id: game.id,
        home,
        visitor,
        homeStats,
        visitorStats,
        status: game.status.long,
        date: game.date
      };
    });

  } catch (error) {
    console.error("❌ Error fetching NBA games:", error);
    return [];
  }
}

module.exports = {
  getTodayGames,
  recentGames
};
