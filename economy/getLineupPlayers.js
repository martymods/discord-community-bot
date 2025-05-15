// /economy/getLineupPlayers.js
const axios = require('axios');

async function getTeamLineup(teamId) {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${new Date().getFullYear()}`;

  try {
    const res = await axios.get(url);
    const players = res.data.roster || [];

    // Only keep batters
    return players.filter(p =>
      p.position.abbreviation !== 'P' && p.person?.id && p.person?.fullName
    ).map(p => ({
      id: p.person.id,
      name: p.person.fullName
    }));
  } catch (err) {
    console.error(`[LINEUP ERROR] Failed for team ${teamId}:`, err.message);
    return [];
  }
}

module.exports = { getTeamLineup };
