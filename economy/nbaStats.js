
// economy/nbaStats.js

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const API_KEY = '36c5da5fe5mshe18e4122dd0e413p12cf89jsnbd5be527669f'; // Your actual RapidAPI key

async function getTeamStats(teamId) {
  const url = `https://api-basketball.p.rapidapi.com/teams/statistics?season=2024-2025&team=${teamId}&league=12`;

  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': 'api-basketball.p.rapidapi.com'
    }
  };

  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(await res.text());

    const json = await res.json();
    return json.response;
  } catch (err) {
    console.error("❌ Error fetching team stats:", err.message);
    return null;
  }
}

module.exports = { getTeamStats };
