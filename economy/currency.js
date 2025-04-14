const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  cash: { type: Number, default: 0 },
  lastDaily: { type: Date, default: null }
});

const Currency = mongoose.model('Currency', userSchema);

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
