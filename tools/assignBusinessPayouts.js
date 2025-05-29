// tools/assignBusinessPayouts.js
const mongoose = require('mongoose');
const Property = require('../economy/propertyModel');

// Your Mongo URI (update if needed)
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGO_URI_HERE';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const tierPayouts = {
  basic: 2000,
  premium: 6000,
  legendary: 15000
};

async function assignPayouts() {
  const properties = await Property.find({});
  let updated = 0;

  for (const prop of properties) {
    const tier = (prop.tier || '').toLowerCase();
    const proposedPayout = tierPayouts[tier] || 0;

    if (!proposedPayout) {
      console.log(`❌ Skipped: ${prop.name} (${prop.id}) — Unknown tier`);
      continue;
    }

    if (prop.payoutPerHour && prop.payoutPerHour > 0) {
      console.log(`⏩ Already has payout: ${prop.name} ($${prop.payoutPerHour})`);
      continue;
    }

    prop.payoutPerHour = proposedPayout;
    await prop.save();
    console.log(`✅ Set ${prop.name} (${prop.id}) → $${proposedPayout}/hr`);
    updated++;
  }

  console.log(`🎉 Finished. Updated ${updated} businesses.`);
  mongoose.connection.close();
}

assignPayouts();
