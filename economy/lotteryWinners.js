const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: String,
  guildId: String,
  number: Number,
  wonAmount: Number,
  wasExact: Boolean,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LotteryWinner', schema);
