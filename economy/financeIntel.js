// economy/financeIntel.js
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

const FINNHUB_API_KEY = 'cvvs82hr01qod00lsvpgcvvs82hr01qod00lsvq0';
const FINANCE_CHANNEL_ID = '1362077468076539904';

async function fetchVolumeData(ticker) {
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`);
  const data = await res.json();
  return data;
}

async function sendFinanceAlert(client, title, fields = []) {
  const channel = client.channels.cache.get(FINANCE_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor('#00ff99')
    .addFields(fields)
    .setFooter({ text: '📊 Finance Intel System' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function scanTicker(client, ticker = 'TSLA') {
  try {
    const data = await fetchVolumeData(ticker);
    const { c: current, h: high, l: low, pc: previousClose } = data;

    if (!current) return;

    // Alert if price nears day high or spikes past previous close by >2%
    if (current >= high * 0.97 || current > previousClose * 1.02) {
      await sendFinanceAlert(client, `🚨 ${ticker} Price Spike`, [
        { name: 'Current Price', value: `$${current.toFixed(2)}`, inline: true },
        { name: 'Day High', value: `$${high.toFixed(2)}`, inline: true },
        { name: 'Prev Close', value: `$${previousClose.toFixed(2)}`, inline: true },
      ]);
    }
  } catch (err) {
    console.error(`❌ Failed to fetch data for ${ticker}:`, err.message);
  }
}

module.exports = {
  scanTicker
};
