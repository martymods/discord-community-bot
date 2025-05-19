// 📦 tasks/updateBusinessPrices.js
const Property = require('../economy/propertyModel');

module.exports = async function updateBusinessPricesDaily() {
  const properties = await Property.find({});
  let updated = 0;

  for (const prop of properties) {
    const fluctuation = 0.9 + Math.random() * 0.2; // ±10% swing
    const newPrice = Math.floor(prop.price * fluctuation);

    // Optional: Cap how far the price can swing from original base
    const min = Math.floor(prop.price * 0.8);
    const max = Math.floor(prop.price * 1.2);
    prop.price = Math.max(min, Math.min(newPrice, max));

    await prop.save();
    updated++;
  }

  console.log(`📈 Updated prices for ${updated} businesses.`);
};
 