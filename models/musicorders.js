const mongoose = require('mongoose');

const MusicOrderSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  paid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MusicOrder', MusicOrderSchema);
