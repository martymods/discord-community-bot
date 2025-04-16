// economy/flowIntel.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { EmbedBuilder } = require('discord.js');

const FINNHUB_API_KEY = 'cvvs82hr01qod00lsvpgcvvs82hr01qod00lsvq0';
const FINANCE_CHANNEL_ID = '1362077468076539904';

async function fetchOptionsFlow(ticker) {
  const res = await fetch(`https://finnhub.io/api/v1/stock/option-chain?symbol=${ticker}&token=${FINNHUB_API_KEY}`);
  return await res.json();
}

function buildFlowEmbed(ticker, alertData) {
  return new EmbedBuilder()
    .setTitle(`💰 Unusual Options Flow: ${ticker}`)
    .setColor('#ffcc00')
    .addFields(
      { name: 'Strike Price', value: alertData.strike.toString(), inline: true },
      { name: 'Type', value: alertData.type, inline: true },
      { name: 'Volume', value: alertData.volume.toString(), inline: true },
      { name: 'Open Interest', value: alertData.openInterest.toString(), inline: true },
      { name: 'Expiry', value: alertData.expirationDate, inline: true }
    )
    .setFooter({ text: 'Options flow might indicate big moves' })
    .setTimestamp();
}

async function scanOptionsFlow(client, ticker) {
  try {
    const data = await fetchOptionsFlow(ticker);
    if (!data?.data) return;

    for (const chain of data.data) {
      for (const contract of chain.options) {
        const { volume, openInterest, type, strike, expirationDate } = contract;
        if (volume && openInterest && volume > openInterest * 2) {
          const embed = buildFlowEmbed(ticker, { volume, openInterest, type, strike, expirationDate });
          const channel = client.channels.cache.get(FINANCE_CHANNEL_ID);
          if (channel) await channel.send({ embeds: [embed] });
        }
      }
    }
  } catch (err) {
    console.error(`❌ Error checking options for ${ticker}:`, err.message);
  }
}

module.exports = {
  scanOptionsFlow
};
