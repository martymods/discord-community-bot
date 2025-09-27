// 📁 tools/assignBusinessPayouts.js
const Property = require('../economy/propertyModel');

module.exports = async function assignBusinessPayouts() {
  const payoutMap = {
    basic: 10000,
    standard: 25000,
    enhanced: 50000,
    premium: 100000,
    elite: 250000,
    legendary: 500000,
    mythic: 1000000
  };

  const businesses = await Property.find({});
  let updated = 0;

  for (const biz of businesses) {
    const tier = (biz.tier || '').toLowerCase();
    const payout = payoutMap[tier];

    if (!payout) {
      console.log(`❌ No payout tier match for ${biz.name || biz.id} — tier: ${tier}`);
      continue;
    }

    biz.payoutPerHour = payout;
    await biz.save();
    updated++;
    console.log(`✅ Set ${biz.name || biz.id} (${tier}) → $${payout.toLocaleString()}/day`);
  }

  console.log(`🎉 Finished. Updated ${updated} businesses.`);
};
