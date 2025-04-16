// economy/sniperTargets.js

const trackedTickers = new Map(); // ticker → { addedBy, source }

function addTrackedTicker(ticker, source = 'manual', addedBy = 'system') {
  trackedTickers.set(ticker.toUpperCase(), { addedBy, source, addedAt: new Date() });
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

module.exports = {
  addTrackedTicker,
  removeTrackedTicker,
  getTrackedTickers,
  getAllSnipers
};
