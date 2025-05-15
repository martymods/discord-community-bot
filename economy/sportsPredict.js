function buildRealTeamStats(games) {
  const statsMap = {};
  const powerScores = {};

  for (const game of games) {
    const home = game.home;
    const away = game.visitor;

    const homeRaw = game.homeStats;
    const awayRaw = game.visitorStats;

    // ✅ Ensure valid fallback protection
    if (!homeRaw || !awayRaw) continue;

    const homeWinPct = homeRaw.wins / (homeRaw.wins + homeRaw.losses);
    const awayWinPct = awayRaw.wins / (awayRaw.wins + awayRaw.losses);

    const homeDiff = homeRaw.pointsPerGame - homeRaw.pointsAllowed;
    const awayDiff = awayRaw.pointsPerGame - awayRaw.pointsAllowed;

    // 🧠 Power formula = Win% * 100 + PPG - Opponent PPG + Diff
    const homePower = (homeWinPct * 100) + homeRaw.pointsPerGame - homeRaw.pointsAllowed + homeDiff;
    const awayPower = (awayWinPct * 100) + awayRaw.pointsPerGame - awayRaw.pointsAllowed + awayDiff;

    statsMap[home] = {
      winPct: homeWinPct,
      pointsPerGame: homeRaw.pointsPerGame,
      pointDiff: homeDiff,
      powerScore: homePower
    };

    statsMap[away] = {
      winPct: awayWinPct,
      pointsPerGame: awayRaw.pointsPerGame,
      pointDiff: awayDiff,
      powerScore: awayPower
    };

    powerScores[home] = homePower;
    powerScores[away] = awayPower;
  }

  // Attach power rankings if needed
  statsMap._powerRankings = Object.fromEntries(
    Object.entries(powerScores).sort((a, b) => b[1] - a[1])
  );

  return statsMap;
}

module.exports = { buildRealTeamStats };
