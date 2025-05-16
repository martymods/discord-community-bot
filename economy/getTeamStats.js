const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const STANDINGS_URL = 'https://api-basketball.p.rapidapi.com/standings?league=12&season=2024';
const API_KEY = process.env.RAPIDAPI_KEY || '36c5da5fe5mshe18e4122dd0e413p12cf89jsnbd5be527669f';

const cachedStats = new Map();
let lastFetchDate = null;

async function loadStandingsData() {
  const today = new Date().toISOString().slice(0, 10);
  if (lastFetchDate === today && cachedStats.size > 0) {
    console.log("🟢 Using cached team stats for today.");
    return;
  }

  console.log("⏳ Fetching fresh standings data from API...");
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

    console.log("📦 Raw API response keys:", Object.keys(json));
    console.log("📦 typeof response:", typeof json.response);
    console.log("📦 First team object:", JSON.stringify(json.response?.[0], null, 2));

    const teamList = json.response;

    if (!Array.isArray(teamList)) {
      console.warn('⚠️ Standings response is not an array.');
      return;
    }

    cachedStats.clear();

    teamList.forEach(entry => {
      const id = Number(entry.team?.id);
      const name = entry.team?.name;
      const logo = entry.team?.logo;
      const played = entry.games?.played;
      const wins = entry.win?.total;
      const ppgRaw = entry.points?.for;
      const papgRaw = entry.points?.against;

      if (!id || !played || !wins || !ppgRaw || !papgRaw) {
        console.warn(`⚠️ Skipped team due to missing data: ${JSON.stringify(entry.team)}`);
        return;
      }

      const losses = played - wins;
      const ppg = parseFloat((ppgRaw / played).toFixed(1));
      const papg = parseFloat((papgRaw / played).toFixed(1));
      const winPct = parseFloat((wins / played).toFixed(3));
      const pointDiff = parseFloat((ppg - papg).toFixed(1));
      const power = parseFloat((winPct * 100 + ppg + pointDiff).toFixed(2));

      cachedStats.set(id, {
        id,
        name,
        logo,
        wins,
        losses,
        winPct,
        pointsPerGame: ppg,
        pointsAllowed: papg,
        pointDiff,
        powerScore: power
      });

      console.log(`✅ Cached stats for: ${name} (ID: ${id}) | Win%: ${winPct}, PPG: ${ppg}, Diff: ${pointDiff}, Power: ${power}`);
    });

    console.log(`📊 Done: ${cachedStats.size} real teams cached from standings API.`);

  } catch (err) {
    console.error('❌ Error fetching team stats from standings API:', err.message);
  }
}

async function getTeamStats(teamId) {
  if (!cachedStats.has(Number(teamId))) {
    console.log(`🔍 Team ID ${teamId} not cached. Triggering reload...`);
    await loadStandingsData();
  }

  const stats = cachedStats.get(Number(teamId));

  if (!stats) {
    console.warn(`⚠️ getTeamStats fallback used for teamId=${teamId}. Cached IDs: ${[...cachedStats.keys()].join(', ')}`);
    return {
      name: `Team ${teamId}`,
      wins: 0,
      losses: 0,
      winPct: 0,
      pointsPerGame: 0,
      pointsAllowed: 0,
      pointDiff: 0,
      powerScore: 0,
      logo: null
    };
  }

  return stats;
}

module.exports = {
  getTeamStats,
  loadStandingsData
};
