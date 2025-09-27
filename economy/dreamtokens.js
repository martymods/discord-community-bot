const mongoose = require('../utils/localMongoose');

const dreamTokenSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  tokens: { type: Number, default: 0 }
});

const DreamTokens = mongoose.model('DreamTokens', dreamTokenSchema);

module.exports = {
  DreamTokens,

  async getTokens(userId, guildId) {
    let user = await DreamTokens.findOne({ userId, guildId });
    if (!user) user = await DreamTokens.create({ userId, guildId });
    return user.tokens;
  },

  async addTokens(userId, guildId, amount) {
    const user = await DreamTokens.findOneAndUpdate(
      { userId, guildId },
      { $inc: { tokens: amount } },
      { new: true, upsert: true }
    );
    return user.tokens;
  },

  async removeTokens(userId, guildId, amount) {
    const user = await DreamTokens.findOneAndUpdate(
      { userId, guildId },
      { $inc: { tokens: -amount } },
      { new: true, upsert: true }
    );
    return user.tokens;
  }
};
