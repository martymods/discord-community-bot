// 📊 Performance Tracker for Penny Snipes
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { addTrackedTicker } = require('../economy/sniperTargets');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const LOG_PATH = path.join(__dirname, '../logs/penny_snipes.json');
const LOG_DIR = path.dirname(LOG_PATH);
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(LOG_PATH)) {
  fs.writeFileSync(LOG_PATH, '[]');
}


if (!FINNHUB_API_KEY) {
  console.error("❌ FINNHUB_API_KEY is missing! Make sure it's set in Render.");
} else {
  console.log(`🔐 FINNHUB_API_KEY loaded (last 6 chars: ${FINNHUB_API_KEY.slice(-6)})`);
}

// Initialize log file if missing
if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, '[]');

function saveSnipeLog(symbol, price, volume, time) {
  const data = JSON.parse(fs.readFileSync(LOG_PATH));
  data.push({ symbol, price, volume, time, grade: null });
  fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2));
}

function gradeSnipes() {
  const data = JSON.parse(fs.readFileSync(LOG_PATH));
  const now = Date.now();

  return Promise.all(data.map(async (entry) => {
    if (entry.grade || now - entry.time < 1000 * 60 * 60 * 24) return entry; // Only grade old ones

    try {
      const res = await axios.get(`https://finnhub.io/api/v1/quote`, {
        params: {
          symbol: entry.symbol,
          token: FINNHUB_API_KEY
        }
      });
      const currentPrice = res.data.c;
      const change = ((currentPrice - entry.price) / entry.price) * 100;

      entry.grade = change > 20 ? '🔥' : change > 10 ? '✅' : change > 0 ? '👍' : '💀';
      entry.change = `${change.toFixed(2)}%`;
    } catch (e) {
      entry.grade = '❓';
      entry.change = 'error';
    }
    return entry;
  })).then(updated => {
    fs.writeFileSync(LOG_PATH, JSON.stringify(updated, null, 2));
    return updated;
  });
}

async function scanForPennySnipers(client) {
  const channel = client.channels.cache.find(c => c.name === 'finance-intel');
  if (!channel) return console.log("❌ Channel 'finance-intel' not found.");

  const all = await axios.get(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${FINNHUB_API_KEY}`);
  const filtered = all.data.filter(s => s.type === 'Common Stock' && s.currency === 'USD' && s.symbol.length <= 5);

  const shuffled = filtered.sort(() => Math.random() - 0.5);
  const hits = [];

  for (const stock of shuffled.slice(0, 100)) {
    console.log(`🔍 Checking ${stock.symbol}...`);
    try {
      const quote = await axios.get(`https://finnhub.io/api/v1/quote`, {
        params: {
          symbol: stock.symbol,
          token: FINNHUB_API_KEY
        }
      });

      const price = quote.data.c;
      const volume = quote.data.v;
      console.log(`↪️ ${stock.symbol} — $${price} | Vol: ${volume ?? 'N/A'}`);

      if (price > 0 && price <= 5) {
        addTrackedTicker(stock.symbol, 'penny', 'scanner-bot');
        hits.push(`• $${stock.symbol} — $${price.toFixed(2)}, Vol: ${volume ?? 'N/A'}`);
        saveSnipeLog(stock.symbol, price, volume, Date.now());
      }

      await new Promise(r => setTimeout(r, 1100));
    } catch (e) {
      console.log(`⚠️ Error fetching ${stock.symbol}:`, e.message);
    }
  }

  if (hits.length) {
    await channel.send(`📡 **Penny Screener Results**\nTop Snipes:\n${hits.join('\n')}`);
  } else {
    await channel.send("📭 No penny stocks found in scan.");
  }
}

module.exports = {
  scanForPennySnipers,
  gradeSnipes
};
