// /economy/getTodayMLBPlayers.js
const axios = require('axios');

async function getTodayMLBPlayers() {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team,probablePitcher,linescore,game(content(summary),live),broadcasts(all)`;

  try {
    const res = await axios.get(url);
    const games = res.data.dates[0]?.games || [];

    return games.map(game => ({
      homeTeamId: game.teams.home.team.id,
      awayTeamId: game.teams.away.team.id,
      homeTeamName: game.teams.home.team.name,
      awayTeamName: game.teams.away.team.name,
      homeProbablePitcher: game.teams.home.probablePitcher?.fullName || 'Unknown',
      awayProbablePitcher: game.teams.away.probablePitcher?.fullName || 'Unknown',
      homePitcherId: game.teams.home.probablePitcher?.id || null,
      awayPitcherId: game.teams.away.probablePitcher?.id || null,
    }));
  } catch (err) {
    console.error('[MLB PLAYER FETCH ERROR]', err.message);
    return [];
  }
}

module.exports = { getTodayMLBPlayers };
