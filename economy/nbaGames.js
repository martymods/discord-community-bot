const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const recentGames = new Map(); // gameId → { home, visitor }

async function getTodayGames() {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await fetch(`https://api-basketball.p.rapidapi.com/games?date=${today}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': '36c5da5fe5mshe18e4122dd0e413p12cf89jsnbd5be527669f',
        'X-RapidAPI-Host': 'api-basketball.p.rapidapi.com'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API returned status ${res.status}: ${errText}`);
    }

    const data = await res.json();

    if (!data.response || data.response.length === 0) {
      console.log("🟡 No games returned for today.");
      return [];
    }

    return data.response.map(game => {
      const home = game.teams?.home?.name || 'Unknown';
      const visitor = game.teams?.away?.name || 'Unknown';

      recentGames.set(String(game.id), { home, visitor });

      return {
        id: game.id,
        home,
        visitor,
        status: game.status?.long || 'Unknown',
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

