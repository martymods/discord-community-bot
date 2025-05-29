// 🔁 tasks/autoBusinessIncome.js (FINAL FIXED)
const Property = require('../economy/propertyModel');
const DealerProfile = require('../economy/dealerProfileModel');
const { addCash } = require('../economy/currency');

// 🔧 Payout values based on lowercase string tiers
const tierPayouts = {
  shack: 10000,
  basic: 25000,
  standard: 50000,
  premium: 100000,
  luxury: 250000,
  elite: 500000,
  empire: 1000000
};

module.exports = async function runAutoBusinessPayout(client) {
  const ownedBusinesses = await Property.find({ ownerId: { $ne: null } });
  const userMap = new Map();

  for (const biz of ownedBusinesses) {
    const tierKey = (biz.tier || '').toLowerCase();
    const payout = tierPayouts[tierKey] || 0;
    if (payout <= 0) continue;

    const displayName = biz.type || biz.id || 'Unnamed Business';

    if (!userMap.has(biz.ownerId)) userMap.set(biz.ownerId, []);
    userMap.get(biz.ownerId).push({ name: displayName, payout });

    await addCash(biz.ownerId, biz.guildId, payout);
  }

  for (const [userId, businesses] of userMap.entries()) {
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) continue;

    const total = businesses.reduce((sum, b) => sum + b.payout, 0);
    const lines = businesses.map(b => `🏢 ${b.name}: +$${b.payout.toLocaleString()}`).join('\n');

    await user.send({
      content: `💰 **Daily Business Income Received!**\nYou earned **$${total.toLocaleString()}** from your businesses:\n\n${lines}`
    }).catch(() => null);
  }

  console.log(`✅ Daily business income distributed to ${userMap.size} users.`);
};
