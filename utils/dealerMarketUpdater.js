const { drugs } = require('./drugList');

function generateRandomPrices() {
  const prices = new Map();
  for (const drug of drugs) {
    const volatility = drug.volatility || 50;
    const price = drug.base + Math.floor(Math.random() * volatility);
    prices.set(drug.id, price);
  }
  return prices;
}

async function refreshDealerMarket(profile) {
  profile.prices = Object.fromEntries(generateRandomPrices());
  await profile.save();
}

module.exports = { refreshDealerMarket };
