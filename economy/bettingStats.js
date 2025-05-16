const mongoose = require('mongoose');

// SAFELY reuse model
const schema = new mongoose.Schema({
  userId: String,
  guildId: String,
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  tokensWon: { type: Number, default: 0 },
  tokensLost: { type: Number, default: 0 }
});

const BettingStats = mongoose.models.BettingStats || mongoose.model('BettingStats', schema);

module.exports = {
  BettingStats,

  async recordWin(userId, guildId, amount) {
    await BettingStats.findOneAndUpdate(
      { userId, guildId },
      { $inc: { wins: 1, tokensWon: amount } },
      { upsert: true, new: true }
    );
  },

  async recordLoss(userId, guildId, amount) {
    await BettingStats.findOneAndUpdate(
      { userId, guildId },
      { $inc: { losses: 1, tokensLost: amount } },
      { upsert: true, new: true }
    );
  },

  async getTopWinners(guildId, limit = 5) {
    return await BettingStats.find({ guildId }).sort({ tokensWon: -1 }).limit(limit);
  }
};
