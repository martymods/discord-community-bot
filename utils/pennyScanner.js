// utils/pennyScanner.js

const axios = require('axios');
const cheerio = require('cheerio');
const { addTrackedTicker } = require('../economy/sniperTargets');

async function scanForPennySnipers(client) {
  const channel = client.channels.cache.find(c => c.name === 'finance-intel');
  if (!channel) return;

  const hits = [];

  try {
    // Yahoo Finance Screener: Penny stocks under $5 with volume
    const res = await axios.get('https://finance.yahoo.com/screener/predefined/penny_stocks');
    const $ = cheerio.load(res.data);

    const rows = $('table tbody tr');

    for (let i = 0; i < rows.length && hits.length < 10; i++) {
      const row = $(rows[i]);
      const cells = row.find('td');

      const ticker = $(cells[0]).text().trim();
      const name = $(cells[1]).text().trim();
      const price = parseFloat($(cells[2]).text().replace(/[^\d.]/g, ''));
      const volume = parseInt($(cells[6]).text().replace(/,/g, ''));

      if (!ticker || isNaN(price) || isNaN(volume)) continue;
      if (price <= 5 && volume > 100000) {
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
