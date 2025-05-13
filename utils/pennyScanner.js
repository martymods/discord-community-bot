// utils/pennyScanner.js

const axios = require('axios');
const { addTrackedTicker } = require('../economy/sniperTargets');

async function scanForPennySnipers(client) {
  const channel = client.channels.cache.find(c => c.name === 'finance-intel');
  if (!channel) {
    console.log("❌ Channel 'finance-intel' not found.");
    return;
  }

  const hits = [];

  try {
    const url = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=penny_stocks&count=25';

    console.log(`📡 Fetching Yahoo Finance penny screener from: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    console.log("✅ Response status:", response.status);
    console.log("🔍 Raw response keys:", Object.keys(response.data || {}));

    const result = response.data?.finance?.result?.[0];
    if (!result) {
      console.log("⚠️ Unexpected response structure:", response.data);
      await channel.send("⚠️ Screener returned unexpected data.");
      return;
    }

    const quotes = result.quotes || [];
    console.log(`📈 Found ${quotes.length} tickers in screener.`);

    for (const quote of quotes) {
      const ticker = quote.symbol;
      const price = quote.regularMarketPrice;
      const volume = quote.regularMarketVolume;

      console.log(`→ ${ticker}: $${price}, Volume: ${volume}`);

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
    console.error("❌ Screener failed:");
    console.error(err);
    await channel.send("⚠️ Error scanning Yahoo Finance for penny stocks.");
  }
}

module.exports = { scanForPennySnipers };
