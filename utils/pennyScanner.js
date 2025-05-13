// utils/pennyScanner.js

const axios = require('axios');
const { addTrackedTicker } = require('../economy/sniperTargets');

async function scanForPennySnipers(client) {
  const channel = client.channels.cache.find(c => c.name === 'finance-intel');
  if (!channel) return;

  const hits = [];

  try {
    const url = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=penny_stocks&count=25';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const quotes = response.data?.finance?.result?.[0]?.quotes || [];

    for (const quote of quotes) {
      const ticker = quote.symbol;
      const price = quote.regularMarketPrice;
      const volume = quote.regularMarketVolume;

      if (price > 0 && price <= 5 && volume >= 100000) {
        addTrackedTicker(ticker, 'penny', 'scanner-bot');
        hits.push(`• $${ticker} — $${price.toFixed(2)}, Vol: ${volume.toLocaleString()}`);
      }
    }

    if (hits.length) {
      await channel.send(`📡 **Live Penny Stock Screener Alert**\nTop Candidates:\n${hits.join('\n')}`);
    } else {
      await channel.send("📡 Screener found no penny stocks meeting criteria.");
    }

  } catch (err) {
    console.error("❌ Screener failed:", err.message);
    await channel.send("⚠️ Error scanning Yahoo Finance for penny stocks.");
  }
}

module.exports = { scanForPennySnipers };
