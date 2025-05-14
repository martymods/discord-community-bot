const axios = require('axios');

async function getTodayNHLGames() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`[NHLPREDICT][DEBUG] Fetching NHL games for date: ${dateStr}`);

    const url = `https://api-web.nhle.com/v1/schedule/${dateStr}`;
    console.log(`[NHLPREDICT][DEBUG] Fetch URL: ${url}`);

    const res = await axios.get(url);

    console.log(`[NHLPREDICT][DEBUG] Status code: ${res.status}`);
    if (!res.data || !Array.isArray(res.data.games)) {
      console.log(`[NHLPREDICT][DEBUG] Unexpected response structure:`, res.data);
      return [];
    }

    const games = res.data.games;
    console.log(`[NHLPREDICT][DEBUG] Raw games data count: ${games.length}`);

    const mappedGames = games.map(game => {
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
