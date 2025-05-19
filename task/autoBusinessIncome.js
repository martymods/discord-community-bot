// 🔁 tasks/autoBusinessIncome.js
const Property = require('../economy/propertyModel');
const DealerProfile = require('../economy/dealerProfileModel');
const { addCash } = require('../economy/currency');

const tierRates = {
  F: 10000,
  E: 25000,
  D: 50000,
  C: 100000,
  B: 250000,
  A: 500000,
  S: 1000000
};

module.exports = async function runAutoBusinessPayout(client) {
  const ownedBusinesses = await Property.find({ ownerId: { $ne: null } });
  const userMap = new Map();

  for (const biz of ownedBusinesses) {
    const payout = tierRates[biz.tier] || 0;
    if (!userMap.has(biz.ownerId)) userMap.set(biz.ownerId, []);
    userMap.get(biz.ownerId).push({ name: biz.type, payout });
    await addCash(biz.ownerId, biz.guildId, payout);
  }

  for (const [userId, businesses] of userMap.entries()) {
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) continue;

    const total = businesses.reduce((sum, b) => sum + b.payout, 0);
    const lines = businesses.map(b => `🏢 ${b.name}: +$${b.payout.toLocaleString()}`).join('\n');

    await user.send({
      content: `💰 **Daily Business Income Received!**
You earned **$${total.toLocaleString()}** from your businesses:

${lines}`
    }).catch(() => null);
  }

  console.log(`✅ Daily business income distributed to ${userMap.size} users.`);
};
