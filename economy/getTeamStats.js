const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_KEY = '36c5da5fe5mshe18e4122dd0e413p12cf89jsnbd5be527669f';
const BASE_URL = 'https://api-basketball.p.rapidapi.com';

async function getTeamStats(teamId) {
  const url = `${BASE_URL}/teams/statistics?season=2024-2025&team=${teamId}&league=12`;

  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': 'api-basketball.p.rapidapi.com'
    }
  };

  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`API status ${res.status}: ${await res.text()}`);

    const json = await res.json();
    const stats = json.response;

    console.log(`📊 Fetched stats for team ${teamId}`);
    console.log(`• Games Played: ${stats.games.played}`);
    console.log(`• Wins: ${stats.games.wins.total}`);
    console.log(`• PPG For: ${stats.points.for.average}`);
    console.log(`• PPG Against: ${stats.points.against.average}`);

    return {
      wins: stats.games.wins.total,
      losses: stats.games.played - stats.games.wins.total,
      pointsPerGame: stats.points.for.average,
      pointsAllowed: stats.points.against.average
    };

  } catch (err) {
    console.warn(`⚠️ getTeamStats fallback for team ${teamId}: ${err.message}`);
    return {
      wins: 40,
      losses: 30,
      pointsPerGame: 100,
      pointsAllowed: 100
    };
  }
}

module.exports = { getTeamStats };
