// economy/sniperTargets.js

const trackedTickers = new Map(); // ticker → { addedBy, source }

function addTrackedTicker(ticker, source = 'manual', addedBy = 'system') {
  trackedTickers.set(ticker.toUpperCase(), {
    addedBy,
    source,
    addedAt: new Date()
  });
}

function removeTrackedTicker(ticker) {
  trackedTickers.delete(ticker.toUpperCase());
}

function getTrackedTickers() {
  return Array.from(trackedTickers.keys());
}

function getAllSnipers() {
  return Array.from(trackedTickers.entries()).map(([ticker, data]) => ({
    ticker,
    ...data
  }));
}

function getSniperRotation(count = 3) {
  const pool = getTrackedTickers();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 🧠 Pre-seed sniper-worthy targets
[
  "PLTR", "SOFI", "NVDA", "RIVN", "SPY", "QQQ", "MARA", "RIOT", "COIN", "TSM", "TQQQ", "BBBY"
].forEach(t => addTrackedTicker(t, 'default', 'system'));

module.exports = {
  addTrackedTicker,
  removeTrackedTicker,
  getTrackedTickers,
  getAllSnipers,
  getSniperRotation
};

