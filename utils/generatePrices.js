// utils/generatePrices.js

const { drugs } = require('./drugList');

function generatePrices() {
  const prices = {};
  for (const drug of drugs) {
    const volatility = drug.volatility || 0.3;
    const fluctuation = (Math.random() * volatility * 2 - volatility) * drug.base;
    prices[drug.id] = Math.max(1, Math.floor(drug.base + fluctuation));
  }
  return prices;
}

module.exports = { generatePrices };
