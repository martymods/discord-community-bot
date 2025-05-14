const axios = require('axios');

async function getTodayNHLGames() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // e.g. '2025-05-14'
    console.log(`[NHLPREDICT][DEBUG] Fetching NHL games for date: ${dateStr}`);

    const url = `https://api-web.nhle.com/v1/schedule/${dateStr}`;
    console.log(`[NHLPREDICT][DEBUG] Fetch URL: ${url}`);

    const res = await axios.get(url);
    console.log(`[NHLPREDICT][DEBUG] Status code: ${res.status}`);

    if (!res.data || !Array.isArray(res.data.gameWeek)) {
      console.log(`[NHLPREDICT][DEBUG] Unexpected response structure:`, res.data);
      return [];
    }

    // Find today’s block
    const todayBlock = res.data.gameWeek.find(day => day.date === dateStr);
    if (!todayBlock || !Array.isArray(todayBlock.games)) {
      console.log(`[NHLPREDICT][DEBUG] No games found for today (${dateStr})`);
      return [];
    }

    console.log(`[NHLPREDICT][DEBUG] Found ${todayBlock.games.length} games`);

    const mappedGames = todayBlock.games.map(game => {
      const home = game.homeTeam?.abbrev;
      const visitor = game.awayTeam?.abbrev;
      console.log(`[NHLPREDICT][DEBUG] Game parsed: ${visitor} @ ${home}`);
      return { home, visitor };
    });

    return mappedGames;
  } catch (err) {
    if (err.response) {
      console.error(`❌ [NHLPREDICT][ERROR] HTTP ${err.response.status} from NHL API`);
      console.error(err.response.data);
    } else {
      console.error("❌ [NHLPREDICT][ERROR] Network or parsing error:", err.message);
    }
    return [];
  }
}

module.exports = { getTodayNHLGames };
