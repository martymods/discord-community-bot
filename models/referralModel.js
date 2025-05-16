// models/referralModel.js
const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  userId: String, // Referrer
  code: String,   // Referral code, e.g., "krill1234"
  referrals: { type: Number, default: 0 },
  earned: { type: Number, default: 0 }
});

referralSchema.index({ code: 1 }, { unique: true });
referralSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Referral', referralSchema);
