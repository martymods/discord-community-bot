const yahooFinance = require('yahoo-finance2').default;
const { getAllSnipers } = require('../economy/sniperTargets');

const spikeMemory = new Map(); // ticker → lastPrice

async function checkForPriceSpikes(client) {
  const channel = client.channels.cache.find(c => c.name === 'finance-intel');
  if (!channel) return;

  const snipers = getAllSnipers().filter(s => s.source === 'penny');
  for (const snipe of snipers) {
    try {
      const quote = await yahooFinance.quote(snipe.ticker);
      const currentPrice = quote.regularMarketPrice;

      const lastPrice = spikeMemory.get(snipe.ticker) || currentPrice;
      const change = ((currentPrice - lastPrice) / lastPrice) * 100;

      if (change >= 10) {
        const emoji = change >= 20 ? "💥" : "🚀";
        channel.send(`${emoji} **${snipe.ticker}** is spiking! +${change.toFixed(2)}% since last check. Current: $${currentPrice.toFixed(2)}`);
      }

      spikeMemory.set(snipe.ticker, currentPrice);
    } catch (err) {
      console.error(`⚠️ Spike check failed for ${snipe.ticker}:`, err.message);
    }
  }
}

module.exports = { checkForPriceSpikes };
