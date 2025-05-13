const axios = require('axios');
const { addTrackedTicker } = require('../economy/sniperTargets');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  console.error("❌ FINNHUB_API_KEY is missing! Make sure it's set in Render's Environment Variables.");
} else {
  console.log(`🔐 FINNHUB_API_KEY loaded (last 6 chars: ${FINNHUB_API_KEY.slice(-6)})`);
}

async function scanForPennySnipers(client) {
  const channel = client.channels.cache.find(c => c.name === 'finance-intel');
  if (!channel) {
    console.log("❌ Channel 'finance-intel' not found.");
    return;
  }

  const hits = [];

  try {
    console.log("📡 Fetching US stock list from Finnhub...");
    const all = await axios.get(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${FINNHUB_API_KEY}`);
    console.log(`✅ Retrieved ${all.data.length} total tickers.`);

    // Filter for USD common stocks
    const filtered = all.data.filter(s =>
      s.type === 'Common Stock' && s.currency === 'USD'
    );

    // Shuffle and limit
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, 150);

    for (const stock of targets) {
      console.log(`🔍 Checking ${stock.symbol}...`);
      try {
        const quote = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${FINNHUB_API_KEY}`);
        const price = quote.data.c;
        const volume = quote.data.v;

        console.log(`↪️ ${stock.symbol} — $${price?.toFixed(2)} | Vol: ${volume?.toLocaleString()}`);

if (price > 0 && price <= 5 && volume >= 50000) {
  addTrackedTicker(stock.symbol, 'penny', 'scanner-bot');
  hits.push(`• $${stock.symbol} — $${price.toFixed(2)}, Vol: ${volume.toLocaleString()}`);
}


        await new Promise(res => setTimeout(res, 1100)); // wait ~1.1s to stay under rate limit
      } catch (e) {
        console.log(`⚠️ Error fetching quote for ${stock.symbol}:`, e.message);
      }
    }

    if (hits.length) {
      await channel.send(`📡 **Penny Stock Screener Results (via Finnhub)**\nTop Candidates:\n${hits.join('\n')}`);
    } else {
      await channel.send("📭 No penny stocks found in Finnhub scan.");
    }

  } catch (err) {
    console.error("❌ Finnhub scanner failed:", err.message);
    await channel.send("⚠️ Failed to scan penny stocks using Finnhub.");
  }
}

module.exports = { scanForPennySnipers };
