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
    console.log(`📡 Requesting Yahoo Finance screener page:\n${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });

    console.log(`✅ HTTP ${response.status} ${response.statusText}`);
    console.log("📦 Headers:", response.headers);
    console.log("📏 Response length:", response.data.length);

    const $ = cheerio.load(response.data);

    const table = $('table');
    if (table.length === 0) {
      console.log("❌ No <table> found in response. Page structure may have changed.");
      await channel.send("⚠️ Screener page loaded but no table was found. Yahoo might've updated their layout.");
      return;
    }

    const rows = $('table tbody tr');
    console.log(`✅ Found ${rows.length} rows in screener table.`);

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
    console.log("❌ Screener failed:");
    console.log("🧵 URL:", url);
    if (err.response) {
      console.log("📉 Response status:", err.response.status);
      console.log("📃 Response headers:", err.response.headers);
      console.log("📄 Response body:", err.response.data?.slice?.(0, 500) ?? '[binary]');
    } else {
      console.log("❗ Request error:", err.message);
    }

    await channel.send("⚠️ Error scraping Yahoo Finance for penny stocks.");
  }
}

module.exports = { scanForPennySnipers };
