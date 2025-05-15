const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const recentGames = new Map();
const API_KEY = '36c5da5fe5mshe18e4122dd0e413p12cf89jsnbd5be527669f'; // ✅ Your actual API key
const { getTeamStats } = require('./getTeamStats');

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

    for (let offset = 0; offset <= 1; offset++) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      const dateStr = date.toISOString().slice(0, 10);
      const url = `https://api-basketball.p.rapidapi.com/games?date=${dateStr}&league=12&season=2024-2025`;

      console.log(`🌐 Fetching NBA games for: ${dateStr}`);
      const res = await fetch(url, options);
      const json = await res.json();

      if (!json.response?.length) {
        console.log(`🟡 No games found for ${dateStr}`);
        continue;
      }

      allGames.push(...json.response);
    }

    console.log("🧪 Detected statuses:", [...new Set(allGames.map(g => g.status.long))]);

    const filteredGames = allGames.filter(g => !skippedStatuses.includes(g.status.long));
    const skippedGames = allGames.filter(g => skippedStatuses.includes(g.status.long));

    console.log(`📊 Total games fetched: ${allGames.length}`);
    console.log(`✅ Games included (${filteredGames.length}):`);
    filteredGames.forEach(g => {
      console.log(`→ ${g.teams.away.name} @ ${g.teams.home.name} — Status: ${g.status.long}`);
    });

    if (skippedGames.length > 0) {
      console.log(`⚠️ Skipped games (${skippedGames.length}):`);
      skippedGames.forEach(g => {
        console.log(`× ${g.teams.away.name} @ ${g.teams.home.name} — Status: ${g.status.long}`);
      });
    }

    const enrichedGames = await Promise.all(
      filteredGames.map(async (game) => {
        const home = game.teams.home.name;
        const visitor = game.teams.away.name;

        const homeTeamId = game.teams.home.id;
        const visitorTeamId = game.teams.away.id;

        const homeStats = await getTeamStats(homeTeamId);
        const visitorStats = await getTeamStats(visitorTeamId);

        const series = parseSeries(game);
        const scores = {
          home: game.scores?.home?.total ?? null,
          away: game.scores?.away?.total ?? null
        };
        const gameTime = new Date(game.date);

        recentGames.set(String(game.id), { home, visitor });

        return {
          id: game.id,
          home,
          visitor,
          status: game.status.long,
          date: game.date,
          gameTime,
          homeStats,
          visitorStats,
          homeLogo: homeStats.logo || null,
          visitorLogo: visitorStats.logo || null,
          series,
          scores
        };
      })
    );

    return enrichedGames;

  } catch (err) {
    console.error("❌ Error fetching NBA games:", err.message);
    return [];
  }
}

function parseSeries(game) {
  const seriesData = game.series ?? {};
  if (!seriesData?.name || !seriesData.games) return null;

  const leader = seriesData.name.split(' ')[0];
  const score = `${seriesData.win.home}-${seriesData.win.away}`;
  const number = seriesData.games;
  const isElimination = number >= 6 && (seriesData.win.home === 3 || seriesData.win.away === 3);

  return {
    leader,
    score,
    number,
    isElimination
  };
}

module.exports = {
  getTodayGames,
  recentGames
};
