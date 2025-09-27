// economy/bettingStatsModel.js
const mongoose = require('../utils/localMongoose');

const BettingStatsSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  tokensWon: { type: Number, default: 0 }
});

module.exports = mongoose.models.BettingStats || mongoose.model('BettingStats', BettingStatsSchema);

