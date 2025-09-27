const mongoose = require('../utils/localMongoose');

const historySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  event: String,
  option: String,
  amount: Number,
  outcome: String, // 'Win' or 'Loss'
  date: { type: Date, default: Date.now }
});

const BettingHistory = mongoose.model('BettingHistory', historySchema);

module.exports = {
  BettingHistory,

  async logBet(userId, guildId, event, option, amount, outcome) {
    await BettingHistory.create({ userId, guildId, event, option, amount, outcome });
  },

  async getUserHistory(userId, guildId, limit = 10) {
    return await BettingHistory.find({ userId, guildId }).sort({ date: -1 }).limit(limit);
  }
};
