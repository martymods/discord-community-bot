// ✅ tools/assignBusinessPayouts.js
const mongoose = require('mongoose');
const Property = require('../economy/propertyModel');

module.exports = async function assignPayouts() {
  const all = await Property.find({});
  let updated = 0;

  for (const biz of all) {
    if (typeof biz.payoutPerHour === 'number' && biz.payoutPerHour > 0) continue;

    const tier = (biz.tier || '').toLowerCase();
    let payout = 1000;

    if (tier === 'basic') payout = 1000;
    else if (tier === 'premium') payout = 6000;
    else if (tier === 'legendary') payout = 25000;

    biz.payoutPerHour = payout;
    await biz.save();
    console.log(`✅ Set ${biz.name || biz.id} → $${payout}/hr`);
    updated++;
  }

  console.log(`🎉 Finished. Updated ${updated} businesses with payoutPerHour.`);
};

