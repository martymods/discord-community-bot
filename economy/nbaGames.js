const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


module.exports = {
  async getTodayGames() {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`https://www.balldontlie.io/api/v1/games?start_date=${today}&end_date=${today}`);
    const data = await res.json();
    return data.data.map(game => ({
      id: game.id,
      home: game.home_team.full_name,
      visitor: game.visitor_team.full_name,
      status: game.status,
      date: game.date,
    }));
  }
};
