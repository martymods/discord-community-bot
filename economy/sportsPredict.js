function buildRealTeamStats(games, injuryReport = {}, playoffSeeds = {}) {
  const stats = {};

  for (const game of games) {
    const { home, visitor, homeStats, visitorStats } = game;

    if (!home || !visitor || !homeStats || !visitorStats) {
      console.warn("[STATSKIP] Incomplete stat block:", { home, visitor, homeStats, visitorStats });
      continue;
    }

    if (!stats[home]) {
      const homeWinPct = homeStats.wins / (homeStats.wins + homeStats.losses);
      const homeDiff = homeStats.pointsPerGame - homeStats.pointsAllowed;
      stats[home] = {
        wins: homeStats.wins,
        losses: homeStats.losses,
        winPct: homeWinPct,
        pointsPerGame: homeStats.pointsPerGame,
        pointDiff: homeDiff,
        powerScore: calculatePower(homeWinPct, homeStats.pointsPerGame, homeDiff)
      };
    }

    if (!stats[visitor]) {
      const visitorWinPct = visitorStats.wins / (visitorStats.wins + visitorStats.losses);
      const visitorDiff = visitorStats.pointsPerGame - visitorStats.pointsAllowed;
      stats[visitor] = {
        wins: visitorStats.wins,
        losses: visitorStats.losses,
        winPct: visitorWinPct,
        pointsPerGame: visitorStats.pointsPerGame,
        pointDiff: visitorDiff,
        powerScore: calculatePower(visitorWinPct, visitorStats.pointsPerGame, visitorDiff)
      };
    }
  }

  stats._powerRankings = Object.entries(stats).map(([team, stat]) => ({
    team,
    powerScore: stat.powerScore,
    winPct: stat.winPct,
    pointDiff: stat.pointDiff
  })).sort((a, b) => b.powerScore - a.powerScore);

  return stats;
}

function calculatePower(winPct, ppg, diff) {
  return (winPct * 100) + ppg + (diff * 1.5);
}

module.exports = { buildRealTeamStats };
