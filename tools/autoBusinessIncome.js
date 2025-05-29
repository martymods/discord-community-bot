// 📁 tools/autoBusinessIncome.js (Enhanced Logging for Testing)
const mongoose = require('mongoose');
const Property = require('../economy/propertyModel');
const { addCash } = require('../economy/currency');

async function runForUser(userId, guildId, message = null) {
  const props = await Property.find({ ownerId: userId });

  if (!props.length) {
    if (message) message.reply("😕 You don’t own any businesses.");
    console.log(`[TESTPAYOUT] ${userId} owns no businesses.`);
    return;
  }

  let totalEarned = 0;
  const logLines = [];

  for (const prop of props) {
    const payout = prop.payoutPerHour || 0;
    totalEarned += payout;

    logLines.push(`🏢 ${prop.name || prop.id} | 💸 $${payout.toLocaleString()} | Tier: ${prop.tier} | Area: ${prop.area}`);
  }

  await addCash(userId, guildId, totalEarned);

  const summary = `💰 You earned **$${totalEarned.toLocaleString()}** from ${props.length} businesses:\n\n${logLines.join('\n')}`;
  console.log(`[TESTPAYOUT RESULT for ${userId}]:\n${summary}`);

  if (message) {
    message.reply(`✅ Manual Business Income Test Complete:\n${summary}`);
  }
}

module.exports = { runForUser };
