const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  seedId: { type: String, default: 'weed_seed_0' }, // optional, allows future seed types
  potType: { type: Number, default: 0 }, // 0 = basic, 1 = med, 2 = top tier
  fertilizer: { type: Number, default: 0 }, // 0–3, boosts growth speed
  plantedAt: { type: Date, required: true },
  lastWatered: { type: Date, required: true },
  harvested: { type: Boolean, default: false },
  dead: { type: Boolean, default: false }
}, { timestamps: true });

plantSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Plant', plantSchema);
