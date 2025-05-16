const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  matchId: { type: String, unique: true },
  guildId: String,
  challengerId: String,
  opponentId: String,
  bet: Number,
  status: { type: String, default: 'pending' },
  winnerId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Match', matchSchema);
