// economy/sniperTargets.js

const trackedTickers = new Map(); // ticker → { addedBy, source }

// 🪙 Penny Stock Check
function isPennyStock(price) {
  return price > 0 && price <= 5;
}

// Placeholder — replace with real API later
async function fetchStockPrice(ticker) {
  // Example hardcoded responses for testing
  const dummyPrices = {
    PLTR: 16.2,
    SOFI: 7.4,
    MARA: 4.1,  // 🪙 Penny
    RIOT: 2.9,  // 🪙 Penny
    BBBY: 0.85  // 🪙 Penny
  };
  return dummyPrices[ticker.toUpperCase()] ?? 3.5; // Default mock
}

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
  getSniperRotation,
  isPennyStock,
  fetchStockPrice
};
