const axios = require('axios');

async function buildNHLTeamStats() {
  try {
    console.log('[NHLPREDICT][STATS] Fetching real NHL team stats...');

    const currentSeason = '20232024';
    const res = await axios.get(`https://api.nhle.com/stats/rest/en/team/summary?cayenneExp=seasonId=${currentSeason}`);
    const teams = res.data?.data || [];

    const teamStats = {};

    // ✅ Manual abbreviation map
    const teamAbbrevs = {
      "Anaheim Ducks": "ANA",
      "Arizona Coyotes": "ARI",
      "Boston Bruins": "BOS",
      "Buffalo Sabres": "BUF",
      "Calgary Flames": "CGY",
      "Carolina Hurricanes": "CAR",
      "Chicago Blackhawks": "CHI",
      "Colorado Avalanche": "COL",
      "Columbus Blue Jackets": "CBJ",
      "Dallas Stars": "DAL",
      "Detroit Red Wings": "DET",
      "Edmonton Oilers": "EDM",
      "Florida Panthers": "FLA",
      "Los Angeles Kings": "LAK",
      "Minnesota Wild": "MIN",
      "Montréal Canadiens": "MTL",
      "Nashville Predators": "NSH",
      "New Jersey Devils": "NJD",
      "New York Islanders": "NYI",
      "New York Rangers": "NYR",
      "Ottawa Senators": "OTT",
      "Philadelphia Flyers": "PHI",
      "Pittsburgh Penguins": "PIT",
      "San Jose Sharks": "SJS",
      "Seattle Kraken": "SEA",
      "St. Louis Blues": "STL",
      "Tampa Bay Lightning": "TBL",
      "Toronto Maple Leafs": "TOR",
      "Vancouver Canucks": "VAN",
      "Vegas Golden Knights": "VGK",
      "Washington Capitals": "WSH",
      "Winnipeg Jets": "WPG"
    };

    for (const team of teams) {
      console.log('[NHL STATS DEBUG] Sample team object:', team);

      const abbrev = teamAbbrevs[team.teamFullName];
      if (!abbrev) {
        console.warn('[NHL STATS WARNING] Missing abbrev for team:', team.teamFullName);
        continue;
      }

      // 🖼️ Build logo URL using known pattern
      const logoUrl = `https://assets.nhle.com/logos/nhl/teams/${abbrev}_light.png`;
      const gamesPlayed = team.gamesPlayed;
      const wins = team.wins;
      const goalsFor = team.goalsFor / gamesPlayed;
      const goalsAgainst = team.goalsAgainst / gamesPlayed;
      const winPct = wins / gamesPlayed;
      const powerScore = winPct * 100 + goalsFor - goalsAgainst;

teamStats[abbrev] = {
  winPct,
  goalsFor,
  goalsAgainst,
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
