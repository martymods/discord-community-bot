// economy/nbaStats.js 
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const API_KEY = '36c5da5fe5mshe18e4122dd0e413p12cf89jsnbd5be527669f';

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
    const json = await res.json();
    const stats = json.response;

    if (!stats || !stats.games?.played || !stats.games?.wins?.total) {
      console.warn(`⚠️ No valid stats for team ${teamId}. Returning fallback.`);
      return {
        wins: 0,
        losses: 0,
        pointsPerGame: 100,
        pointsAllowed: 100,
        powerScore: 135.0,
        winPct: 0,
        pointDiff: 0
      };
    }

    const gamesPlayed = stats.games.played;
    const wins = stats.games.wins.total;
    const losses = gamesPlayed - wins;

    const pointsFor = stats.points.for;
    const pointsAgainst = stats.points.against;

    const ppg = +(pointsFor / gamesPlayed).toFixed(1);
    const papg = +(pointsAgainst / gamesPlayed).toFixed(1);
    const pointDiff = +(ppg - papg).toFixed(1);
    const winPct = +(wins / gamesPlayed).toFixed(3);

    const powerScore = +(ppg + winPct * 100 + pointDiff * 2).toFixed(2);

    return {
      wins,
      losses,
      pointsPerGame: ppg,
      pointsAllowed: papg,
      powerScore,
      winPct,
      pointDiff
    };
  } catch (err) {
    console.error("❌ Error fetching team stats:", err.message);
    return {
      wins: 0,
      losses: 0,
      pointsPerGame: 100,
      pointsAllowed: 100,
      powerScore: 135.0,
      winPct: 0,
      pointDiff: 0
    };
  }
}

module.exports = { getTeamStats };
