// utils/fetchStockPrice.js
const yahooFinance = require('yahoo-finance2').default;

async function fetchStockPrice(ticker) {
  try {
    const result = await yahooFinance.quote(ticker);
    return result.regularMarketPrice;
  } catch (err) {
    console.error(`❌ Error fetching price for ${ticker}:`, err);
    return null;
  }
}

function isPennyStock(price) {
  return typeof price === 'number' && price > 0 && price < 5;
}

module.exports = { fetchStockPrice, isPennyStock };
