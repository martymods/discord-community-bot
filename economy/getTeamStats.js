const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const STANDINGS_URL = 'https://api-basketball.p.rapidapi.com/standings?league=12&season=2024-2025';
const API_KEY = process.env.RAPIDAPI_KEY || 'YOUR_KEY_HERE';

const cachedStats = new Map();
let lastFetchDate = null;

async function loadStandingsData() {
  const today = new Date().toISOString().slice(0, 10);
  if (lastFetchDate === today && cachedStats.size > 0) return; // avoid re-fetch

  console.log("⏳ Loading team stats from standings API...");
  lastFetchDate = today;

  try {
    const res = await fetch(STANDINGS_URL, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'api-basketball.p.rapidapi.com'
      }
    });
    const json = await res.json();

console.log("📦 FULL STANDINGS DUMP:");
console.dir(json, { depth: null }); // 👈 This shows the entire nested object structure


    const teamList = json.response;
    if (!teamList || !Array.isArray(teamList)) {
      console.warn('⚠️ Standings response is not an array.');
      return;
    }

    cachedStats.clear();

    teamList.forEach(entry => {
      const id = entry.team?.id;
      const name = entry.team?.name;
      const logo = entry.team?.logo;
      const played = entry.games?.played;
      const wins = entry.win?.total;
      const ppgRaw = entry.points?.for;
      const papgRaw = entry.points?.against;

      if (!id || !played || !wins || !ppgRaw || !papgRaw) return;

      const losses = played - wins;
      const ppg = parseFloat((ppgRaw / played).toFixed(1));
      const papg = parseFloat((papgRaw / played).toFixed(1));

      cachedStats.set(id, {
        name,
        wins,
        losses,
        pointsPerGame: ppg,
        pointsAllowed: papg,
        logo
      });
    });

    console.log(`📊 Cached ${cachedStats.size} real team records from standings.`);
  } catch (err) {
    console.error('❌ Error loading standings data:', err.message);
  }
}

async function getTeamStats(teamId) {
  if (!cachedStats.has(teamId)) await loadStandingsData();
  const stats = cachedStats.get(teamId);

  if (!stats) {
    console.warn(`⚠️ Team ID ${teamId} not found in standings. Returning fallback.`);
    return {
      name: `Team ${teamId}`,
      wins: 40,
      losses: 30,
      pointsPerGame: 100,
      pointsAllowed: 100,
      logo: null
    };
  }

  return stats;
}

module.exports = { getTeamStats };
