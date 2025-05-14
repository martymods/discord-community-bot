const axios = require('axios');

async function buildNHLTeamStats() {
  try {
    console.log('[NHLPREDICT][STATS] Fetching real NHL team stats...');

    const currentSeason = '20232024';
    const summaryRes = await axios.get(`https://api.nhle.com/stats/rest/en/team/summary?cayenneExp=seasonId=${currentSeason}`);
    const last10Res = await axios.get('https://api-web.nhle.com/v1/standings/now');

    const teams = summaryRes.data?.data || [];
    const last10Data = last10Res.data?.standings || [];

    const teamStats = {};

    const teamAbbrevs = {
      "Anaheim Ducks": "ANA", "Arizona Coyotes": "ARI", "Boston Bruins": "BOS",
      "Buffalo Sabres": "BUF", "Calgary Flames": "CGY", "Carolina Hurricanes": "CAR",
      "Chicago Blackhawks": "CHI", "Colorado Avalanche": "COL", "Columbus Blue Jackets": "CBJ",
      "Dallas Stars": "DAL", "Detroit Red Wings": "DET", "Edmonton Oilers": "EDM",
      "Florida Panthers": "FLA", "Los Angeles Kings": "LAK", "Minnesota Wild": "MIN",
      "Montréal Canadiens": "MTL", "Nashville Predators": "NSH", "New Jersey Devils": "NJD",
      "New York Islanders": "NYI", "New York Rangers": "NYR", "Ottawa Senators": "OTT",
      "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", "San Jose Sharks": "SJS",
      "Seattle Kraken": "SEA", "St. Louis Blues": "STL", "Tampa Bay Lightning": "TBL",
      "Toronto Maple Leafs": "TOR", "Vancouver Canucks": "VAN", "Vegas Golden Knights": "VGK",
      "Washington Capitals": "WSH", "Winnipeg Jets": "WPG"
    };

    for (const team of teams) {
      const abbrev = teamAbbrevs[team.teamFullName];
      if (!abbrev) {
        console.warn('[NHL STATS WARNING] Missing abbrev for team:', team.teamFullName);
        continue;
      }

      const logoUrl = `https://assets.nhle.com/logos/nhl/teams/${abbrev}_light.png`;
      const gamesPlayed = team.gamesPlayed;
      const wins = team.wins;
      const goalsFor = team.goalsFor / gamesPlayed;
      const goalsAgainst = team.goalsAgainst / gamesPlayed;
      const winPct = wins / gamesPlayed;
      const powerPlayPct = team.powerPlayPct || 0;
      const penaltyKillPct = team.penaltyKillPct || 0;
      const shotsForPerGame = team.shotsForPerGame || 0;
      const shotsAgainstPerGame = team.shotsAgainstPerGame || 0;

      const last10 = last10Data.find(t => t.teamAbbrev.default === abbrev);
      const last10Wins = last10?.records?.last10?.wins || 0;
      const last10Games = last10?.records?.last10?.gamesPlayed || 10;
      const last10WinRate = last10Wins / last10Games;

      const powerScore =
        winPct * 100 +
        (goalsFor - goalsAgainst) +
        (powerPlayPct + penaltyKillPct) +
        (shotsForPerGame - shotsAgainstPerGame) +
        last10WinRate * 25;

      teamStats[abbrev] = {
        winPct,
        goalsFor,
        goalsAgainst,
        powerPlayPct,
        penaltyKillPct,
        shotsForPerGame,
        shotsAgainstPerGame,
        last10WinRate,
        powerScore,
        logo: logoUrl,
        fullName: team.teamFullName
      };

      console.log(`[NHL STATS] Mapped ${team.teamFullName} → ${abbrev}`);
    }

    console.log('[NHLPREDICT][STATS] Team stats loaded for:', Object.keys(teamStats));
    return teamStats;
  } catch (err) {
    console.error('❌ [NHLPREDICT][STATS ERROR]:', err.message);
    return {};
  }
}

module.exports = { buildNHLTeamStats };
