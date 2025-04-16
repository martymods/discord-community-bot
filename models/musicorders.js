const mongoose = require('mongoose');

const MusicOrderSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  paid: { type: Boolean, default: false },
  submitted: { type: Boolean, default: false }, // ✅ Add this line
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MusicOrder', MusicOrderSchema);
