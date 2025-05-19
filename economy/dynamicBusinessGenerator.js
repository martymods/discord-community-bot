// 📈 economy/dynamicBusinessGenerator.js
const mongoose = require('mongoose');
const Property = require('./propertyModel');

const businessTypes = [
  { type: 'Coffee Shop', base: 1.5e6 },
  { type: 'Ice Cream Stand', base: 2e6 },
  { type: 'Pawn Shop', base: 3e6 },
  { type: 'Food Truck', base: 4.5e6 },
  { type: 'Laundromat', base: 6e6 },
  { type: 'Arcade', base: 9e6 },
  { type: 'Movie Theater', base: 2e7 },
  { type: 'Apartment Complex', base: 5e7 },
  { type: 'Strip Mall', base: 9e7 },
  { type: 'Supermarket', base: 1.5e8 },
  { type: 'Casino', base: 2.25e8 },
  { type: 'Bank', base: 4e8 },
  { type: 'Resort', base: 7.5e8 },
  { type: 'Oil Rig', base: 1.2e9 },
  { type: 'Tech Campus', base: 5e9 },
  { type: 'Launch Site', base: 10e9 }
];

function getRandomArea() {
  const zones = ['Downtown', 'Beachfront', 'Suburbs', 'Industrial', 'Uptown', 'Eastside', 'West End'];
  return zones[Math.floor(Math.random() * zones.length)];
}

function getRandomTier(price) {
  if (price < 5e6) return 'F';
  if (price < 1e7) return 'E';
  if (price < 5e7) return 'D';
  if (price < 1e8) return 'C';
  if (price < 5e8) return 'B';
  if (price < 1e9) return 'A';
  return 'S';
}

async function generateDynamicProperties() {
  const existing = await Property.find({});
  if (existing.length > 0) {
    console.log(`⚠️ Skipped generation — ${existing.length} properties already exist.`);
    return;
  }

  let idCount = 1;
  const newProps = [];

  for (let i = 0; i < 93; i++) {
    const biz = businessTypes[Math.floor(Math.random() * businessTypes.length)];
    const dynamicPrice = Math.floor(biz.base * (0.9 + Math.random() * 0.2)); // ✅ adds variety
    const stashBonus = Math.floor(dynamicPrice / 1e7) + 1;
    const tier = getRandomTier(dynamicPrice);
    const prop = new Property({
      id: `biz_${idCount}`,
      type: biz.type,
      price: dynamicPrice,
      stashBonus,
      tier,
      area: getRandomArea(),
      ownerId: null,
      purchaseDate: null,
      eventType: assignEventType(biz.type)
    });
    newProps.push(prop);
    idCount++;
  }

  await Property.insertMany(newProps);
  console.log(`✅ Generated ${newProps.length} dynamic properties.`);
}


function assignEventType(bizType) {
  const events = {
    'Casino': 'heist',
    'Tech Campus': 'ipo',
    'Bank': 'robbery',
    'Apartment Complex': 'rent_spike',
    'Coffee Shop': 'viral_tiktok',
    'Arcade': 'gaming_night',
    'Launch Site': 'investigation',
    'Oil Rig': 'leak_risk',
    'Resort': 'celebrity_visit',
    'Movie Theater': 'premiere_bonanza',
    'Strip Mall': 'clearance_sale'
  };
  return events[bizType] || null;
}

module.exports = { generateDynamicProperties };
