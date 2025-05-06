// economy/playerStatsModel.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: String,
  guildId: String,
  strength: { type: Number, default: 0 },
  agility: { type: Number, default: 0 },
  grit: { type: Number, default: 0 },
  luck: { type: Number, default: 0 },
  intellect: { type: Number, default: 0 },
  vitality: { type: Number, default: 0 },
  points: { type: Number, default: 0 }
});

schema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('PlayerStats', schema);
