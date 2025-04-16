const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const recentGames = new Map(); // gameId → { home, visitor }

async function getTodayGames() {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await fetch(`https://www.balldontlie.io/api/v1/games?start_date=${today}&end_date=${today}`);
    const data = await res.json();

    if (!data || !data.data || data.data.length === 0) {
      console.log("🟡 No games returned for today.");
      return [];
    }

    return data.data.map(game => {
      recentGames.set(String(game.id), {
        home: game.home_team.full_name,
        visitor: game.visitor_team.full_name
      });

      return {
        id: game.id,
        home: game.home_team.full_name,
        visitor: game.visitor_team.full_name,
        status: game.status,
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
