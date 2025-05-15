const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_KEY = '36c5da5fe5mshe18e4122dd0e413p12cf89jsnbd5be527669f';
const STANDINGS_URL = 'https://api-basketball.p.rapidapi.com/standings?league=12&season=2024-2025';

let cachedStats = new Map();

async function loadStandingsData() {
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': 'api-basketball.p.rapidapi.com'
    }
  };

  try {
    const res = await fetch(STANDINGS_URL, options);
    const json = await res.json();

    const rawStandings = json.response?.[0]?.standings?.[0]; // 🛠️ the true list

    if (!rawStandings || !Array.isArray(rawStandings)) {
      console.warn('⚠️ No valid standings data structure found.');
      return;
    }

    rawStandings.forEach(entry => {
      const id = entry.team.id;
      const name = entry.team.name;
      const gamesPlayed = entry.all.played || 82;
      const wins = entry.all.win;
      const losses = gamesPlayed - wins;
      const ppg = parseFloat((entry.points.for / gamesPlayed).toFixed(1));
      const papg = parseFloat((entry.points.against / gamesPlayed).toFixed(1));

      cachedStats.set(id, {
        name,
        wins,
        losses,
        pointsPerGame: ppg,
        pointsAllowed: papg
      });
    });

    console.log(`📊 Cached ${cachedStats.size} team records from standings.`);
  } catch (err) {
    console.error('❌ Error loading standings data:', err.message);
  }
}


async function getTeamStats(teamId) {
  if (!cachedStats.size) {
    console.log('⏳ Loading team stats from standings API...');
    await loadStandingsData();
  }

  if (cachedStats.has(teamId)) {
    const team = cachedStats.get(teamId);
    console.log(`📈 Found stats for team ${team.name}:`, team);
    return team;
  } else {
    console.warn(`⚠️ Team ID ${teamId} not found in standings. Returning fallback.`);
    return {
      wins: 40,
      losses: 30,
      pointsPerGame: 100,
      pointsAllowed: 100
    };
  }
}

module.exports = { getTeamStats };

