// economy/sportsPredictNHL.js
const axios = require('axios');

function calculatePowerScore(stats) {
  const { winPct, goalsFor, goalsAgainst } = stats;
  return winPct * 100 + goalsFor - goalsAgainst;
}

function parseTeamStats(data) {
  const teamStats = {};
  for (const team of data) {
    const { abbreviation, stats } = team;
    const gamesPlayed = stats.gamesPlayed;
    const wins = stats.wins;
    const goalsFor = stats.goalsFor / gamesPlayed;
    const goalsAgainst = stats.goalsAgainst / gamesPlayed;

    const winPct = wins / gamesPlayed;

    teamStats[abbreviation] = {
      winPct,
      goalsFor,
      goalsAgainst,
      powerScore: calculatePowerScore({ winPct, goalsFor, goalsAgainst })
    };
  }
  return teamStats;
}

function buildNHLTeamStats(games) {
  const sampleStats = {
    BOS: { wins: 52, gamesPlayed: 82, goalsFor: 270, goalsAgainst: 210 },
    NYR: { wins: 48, gamesPlayed: 82, goalsFor: 260, goalsAgainst: 215 },
    TOR: { wins: 46, gamesPlayed: 82, goalsFor: 250, goalsAgainst: 225 },
    EDM: { wins: 50, gamesPlayed: 82, goalsFor: 300, goalsAgainst: 240 },
    // Add more teams here...
  };

  // 🧠 Convert raw to parsed
  const rawTeamArray = Object.entries(sampleStats).map(([abbr, stats]) => ({
    abbreviation: abbr,
    stats
  }));

  return parseTeamStats(rawTeamArray);
}

module.exports = { buildNHLTeamStats };
