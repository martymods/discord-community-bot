const mongoose = require('mongoose');

const poolSchema = new mongoose.Schema({
  poolId: { type: String, unique: true },
  guildId: String,
  players: [String], // userIds
  bets: { type: Map, of: Number }, // userId => bet amount
  matched: Boolean,
  matchId: String,
  winnerId: String,
  rake: Number,
  status: { type: String, default: 'open' }, // open, matched, resolved
  createdAt: { type: Date, default: Date.now }
});

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.PoolMatch || mongoose.model('PoolMatch', poolSchema);
 