function simpleLogicPredict(game, teamStats) {
    const { home, visitor } = game;
    const homeStats = teamStats[home];
    const awayStats = teamStats[visitor];
  
    const homeHot = homeStats.recentWins >= 4;
    const awayCold = awayStats.recentLosses >= 4;
  
    if (homeHot && awayCold) return home;
    if (awayStats.recentWins >= 4 && homeStats.recentLosses >= 4) return visitor;
    if (homeStats.homeWinRate > 0.7) return home;
  
    return null;
  }
  
  function weightedScorePredict(game, teamStats) {
    const { home, visitor } = game;
    const homeStats = teamStats[home];
    const awayStats = teamStats[visitor];
  
    const score = (t, isHome) => 
      (t.winStreak * 2) +
      (t.avgPoints * 1) +
      (t.headToHeadAdvantage * 2) +
      (isHome ? 1.5 : 0);
  
    const homeScore = score(homeStats, true);
    const awayScore = score(awayStats, false);
  
    return homeScore > awayScore ? home : visitor;
  }
  
  module.exports = {
    simpleLogicPredict,
    weightedScorePredict
  };
  