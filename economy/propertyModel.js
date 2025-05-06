// 📁 economy/propertyModel.js
const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  area: String, // Example: "Downtown"
  tier: String, // Example: "basic", "luxury"
  price: Number,
  stashBonus: Number,
  ownerId: { type: String, default: null },
  purchaseDate: Date
});

module.exports = mongoose.model('Property', PropertySchema);
