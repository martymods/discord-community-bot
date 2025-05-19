const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  cash: { type: Number, default: 0 },
  lastDaily: { type: Date, default: null },
  streak: { type: Number, default: 0 },
  gang: { type: String, default: null },
  username: { type: String, default: '' },
  crimeTier: { type: Number, default: 1 },              // ✅ NEW
  crimesCompleted: { type: Number, default: 0 }         // ✅ NEW
});

const Currency = mongoose.model('Currency', currencySchema);

module.exports = {
  Currency,

  async getBalance(userId, guildId) {
    let user = await Currency.findOne({ userId, guildId });
    if (!user) {
      user = await Currency.create({ userId, guildId });
    }
    return user.cash;
  },

  async addCash(userId, guildId, amount) {
    const user = await Currency.findOneAndUpdate(
      { userId, guildId },
      { $inc: { cash: amount } },
      { new: true, upsert: true }
    );
    return user.cash;
  },

  async removeCash(userId, guildId, amount) {
    const user = await Currency.findOneAndUpdate(
      { userId, guildId },
      { $inc: { cash: -amount } },
      { new: true, upsert: true }
    );
    return user.cash;
  }
};

