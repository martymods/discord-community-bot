// 📁 economy/propertyModel.js
const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  area: String, // Example: "Downtown"
  tier: String, // Example: "basic", "luxury"
  price: Number,
  stashBonus: Number,
  ownerId: { type: String, default: null },
  purchaseDate: Date,

  // ✅ NEW FIELDS
  payoutPerHour: { type: Number, default: 0 },
  name: { type: String, default: null }, // e.g., "📦 Corner Supply Co."
  type: { type: String, default: null }  // optional: could be used for filtering later
});

module.exports = mongoose.model('Property', PropertySchema);
