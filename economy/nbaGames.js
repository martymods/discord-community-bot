const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const recentGames = new Map(); // gameId → { home, visitor }

const API_KEY = '36c5da5fe5mshe18e4122dd0e413p12cf89jsnbd5be527669f';
const skippedStatuses = ['Finished', 'After OT', 'Final', 'FT', 'Game Finished', 'Full Time'];

async function getTodayGames() {
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
      console.log(`🌐 Requesting URL: ${url}`);

      const res = await fetch(url, options);

      if (!res.ok) {
        const text = await res.text();
        console.error(`❌ API Error ${res.status}: ${text}`);
        continue;
      }

      const json = await res.json();

      console.log("📦 FULL GAME API RAW DUMP:");
      console.dir(json, { depth: null });

      if (!json.response || !Array.isArray(json.response)) {
        console.warn("⚠️ API response missing or not an array.");
        continue;
      }

      if (!json.response.length) {
        console.log(`🟡 No games found for ${dateStr}`);
        continue;
      }

      allGames.push(...json.response);
    }

    console.log("🧪 Detected statuses:", [...new Set(allGames.map(g => g.status?.long || 'UNKNOWN'))]);
    console.log(`📊 Total games fetched: ${allGames.length}`);

    const filteredGames = allGames.filter(g => !skippedStatuses.includes(g.status?.long));
    const skippedGames = allGames.filter(g => skippedStatuses.includes(g.status?.long));

    console.log(`✅ Games included (${filteredGames.length}):`);
    filteredGames.forEach(g => {
      console.log(`→ ${g.teams?.away?.name} @ ${g.teams?.home?.name} — Status: ${g.status?.long}`);
    });

    if (skippedGames.length > 0) {
      console.log(`⚠️ Skipped games (${skippedGames.length}):`);
      skippedGames.forEach(g => {
        console.log(`× ${g.teams?.away?.name} @ ${g.teams?.home?.name} — Status: ${g.status?.long}`);
      });
    }

    return filteredGames.map(game => {
      const home = game.teams?.home?.name || 'Unknown Home';
      const visitor = game.teams?.away?.name || 'Unknown Visitor';
      const gameTime = new Date(game.date);

      recentGames.set(String(game.id), { home, visitor });

      return {
        id: game.id,
        home,
        visitor,
        status: game.status?.long || 'Unknown',
        date: game.date,
        gameTime,
        homeStats: { id: game.teams?.home?.id || null },
        visitorStats: { id: game.teams?.away?.id || null },
        scores: {
          home: game.scores?.home?.total ?? null,
          away: game.scores?.away?.total ?? null
        },
        series: parseSeries(game),
        homeLogo: game.teams?.home?.logo || null,
        visitorLogo: game.teams?.away?.logo || null
      };
    });

  } catch (err) {
    console.error("❌ Error fetching NBA games:", err.message);
    return [];
  }
}

function parseSeries(game) {
  const s = game.series ?? {};
  if (!s?.name || !s.games) return null;

  const leader = s.name.split(' ')[0];
  const score = `${s.win?.home}-${s.win?.away}`;
  const number = s.games;
  const isElimination = number >= 6 && (s.win?.home === 3 || s.win?.away === 3);

  return { leader, score, number, isElimination };
}

module.exports = {
  getTodayGames,
  recentGames
};
