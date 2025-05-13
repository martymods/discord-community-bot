const yahooFinance = require('yahoo-finance2').default;
const { addTrackedTicker } = require('../economy/sniperTargets');

const candidateTickers = ['MARA', 'SIRI', 'NOK', 'BBBY', 'BBIG', 'MVIS', 'SOFI', 'IDEX', 'ZNGA', 'NNDM'];

async function scanForPennySnipers(client) {
  const channel = client.channels.cache.find(c => c.name === 'finance-intel');
  if (!channel) return;

  const hits = [];

  for (const ticker of candidateTickers) {
    try {
      const quote = await yahooFinance.quote(ticker);
      const price = quote.regularMarketPrice;
      const volume = quote.regularMarketVolume;

      if (price > 0 && price <= 5 && volume >= 100000) {
        addTrackedTicker(ticker, 'auto-scan', 'scanner-bot');
        hits.push(`• $${ticker} — $${price.toFixed(2)}, Vol: ${volume.toLocaleString()}`);
      }

    } catch (err) {
      console.error(`❌ Error scanning ${ticker}:`, err.message);
    }
  }

  if (hits.length > 0) {
    channel.send(`📡 **Penny Stock Scanner Alert**\nTop Candidates:\n${hits.join('\n')}`);
  } else {
    channel.send(`📡 Scanner found no valid penny candidates this round.`);
  }
}

module.exports = { scanForPennySnipers };
