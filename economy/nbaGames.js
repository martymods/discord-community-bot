const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const recentGames = new Map(); // gameId → { home, visitor }

const API_KEY = '36c5da5fe5mshe18e4122dd0e413p12cf89jsnbd5be527669f';

async function getTodayGames() {
  const skippedStatuses = ['Finished', 'After OT', 'Final', 'FT', 'Game Finished', 'Full Time'];
  const allGames = [];

  try {
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'api-basketball.p.rapidapi.com'
      }
    };

    // Try fetching both today and tomorrow
    for (let offset = 0; offset <= 1; offset++) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      const dateStr = date.toISOString().slice(0, 10);
      const url = `https://api-basketball.p.rapidapi.com/games?date=${dateStr}&league=12&season=2024-2025`;

      console.log(`🌐 Fetching NBA games for: ${dateStr}`);
      const res = await fetch(url, options);

      if (!res.ok) {
        throw new Error(`API error on ${dateStr}: ${res.status} — ${await res.text()}`);
      }

      const json = await res.json();
      if (!json.response || json.response.length === 0) {
        console.log(`🟡 No games found for ${dateStr}`);
        continue;
      }

      console.log(`📦 Raw games from ${dateStr}:`);
      json.response.forEach(game => {
        console.log(`🧪 ${game.teams.away.name} @ ${game.teams.home.name} — Status: ${game.status.long}`);
      });

      allGames.push(...json.response);
    }

    if (allGames.length === 0) {
      console.log("🟠 No NBA games found in either date window.");
      return [];
    }

    // Filter out completed games
    const filteredGames = allGames.filter(game => !skippedStatuses.includes(game.status.long));
    const skippedGames = allGames.filter(game => skippedStatuses.includes(game.status.long));

    console.log(`📊 Total games fetched (combined): ${allGames.length}`);
    console.log(`✅ Included games (${filteredGames.length}):`);
    filteredGames.forEach(game => {
      console.log(`→ ${game.teams.away.name} @ ${game.teams.home.name} — Status: ${game.status.long}`);
    });

    if (skippedGames.length > 0) {
      console.log(`⚠️ Skipped games (${skippedGames.length}):`);
      skippedGames.forEach(game => {
        console.log(`× ${game.teams.away.name} @ ${game.teams.home.name} — Status: ${game.status.long}`);
      });
    }

    // Convert to internal format
    return filteredGames.map(game => {
      const home = game.teams.home.name;
      const visitor = game.teams.away.name;

      // Mock stats — replace later with real team stats if available
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

  } catch (err) {
    console.error("❌ [NBA FETCH ERROR]:", err.message);
    return [];
  }
}

module.exports = {
  getTodayGames,
  recentGames
};
