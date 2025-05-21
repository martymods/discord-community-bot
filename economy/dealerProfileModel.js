// discord-community-bot/economy/dealerProfileModel.js

const mongoose = require('mongoose');

const dealerProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  stashCap: { type: Number, default: 20 },
  stashUsed: { type: Number, default: 0 },
  inventory: {
    type: Map,
    of: Number,
    default: {}
  },
  prices: {
    type: Map,
    of: Number,
    default: {}
  },
  lastPriceUpdate: { type: Number, default: Date.now },
  lastEventTime: { type: Number, default: 0 },
  lastMarketMessageId: { type: String, default: null },
  raidCooldown: { type: Number, default: 0 },

  // 🏦 Bank system additions
  bankAccess: { type: Boolean, default: false },
  bankBalance: { type: Number, default: 0 },

  // 🌟 Drug Enhancement System
  enhancements: {
    type: Map,
    of: Number,
    default: {}
  }
});

dealerProfileSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('DealerProfile', dealerProfileSchema); // ✅ ONLY THIS
