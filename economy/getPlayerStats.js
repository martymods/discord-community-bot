// /economy/getPlayerStats.js
const axios = require('axios');

async function getPlayerStats(playerId, group = 'hitting') {
  try {
    const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&group=${group}`;
    const res = await axios.get(url);
    const stats = res.data.stats?.[0]?.splits?.[0]?.stat || null;
    return stats;
  } catch (err) {
    console.error(`[PLAYER STATS ERROR] Failed for ${playerId}:`, err.message);
    return null;
  }
}

module.exports = { getPlayerStats };
