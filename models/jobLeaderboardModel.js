const mongoose = require('mongoose');

const jobLeaderboardSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  month: String, // Format: YYYY-MM
  earnedThisMonth: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('JobLeaderboard', jobLeaderboardSchema);
