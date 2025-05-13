// utils/pennyScanner.js

const axios = require('axios');
const cheerio = require('cheerio');
const { addTrackedTicker } = require('../economy/sniperTargets');

async function scanForPennySnipers(client) {
  const channel = client.channels.cache.find(c => c.name === 'finance-intel');
  if (!channel) {
    console.log("❌ Channel 'finance-intel' not found.");
    return;
  }

  const hits = [];
  const url = 'https://finance.yahoo.com/screener/predefined/penny_stocks';

  try {
    console.log(`📡 Scraping Yahoo Finance penny screener from: ${url}`);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const $ = cheerio.load(data);
    const rows = $('table tbody tr');

    console.log(`✅ Found ${rows.length} rows in table.`);

    rows.each((i, row) => {
      const cells = $(row).find('td');
      const ticker = $(cells[0]).text().trim();
      const price = parseFloat($(cells[2]).text().replace(/[^\d.]/g, ''));
      const volume = parseInt($(cells[6]).text().replace(/,/g, ''));

      console.log(`→ ${ticker}: $${price}, Volume: ${volume}`);

      if (ticker && price > 0 && price <= 5 && volume >= 100000) {
        addTrackedTicker(ticker, 'penny', 'scanner-bot');
        hits.push(`• $${ticker} — $${price.toFixed(2)}, Vol: ${volume.toLocaleString()}`);
      }
    });

    if (hits.length) {
      await channel.send(`📡 **Live Penny Stock Screener Alert**\nTop Candidates:\n${hits.join('\n')}`);
    } else {
      await channel.send("📡 Screener found no penny stocks meeting criteria.");
    }

  } catch (err) {
    console.error("❌ Screener failed:", err.message);
    await channel.send("⚠️ Error scraping Yahoo Finance for penny stocks.");
  }
}

module.exports = { scanForPennySnipers };
