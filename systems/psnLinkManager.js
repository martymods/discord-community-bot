const mongoose = require('mongoose');

const psnSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  psnId: String
});

const PSNLink = mongoose.model('PSNLink', psnSchema);

module.exports = {
  async setPSN(userId, guildId, psnId) {
    await PSNLink.findOneAndUpdate(
      { userId, guildId },
      { psnId },
      { upsert: true, new: true }
    );
  },

  async getPSN(userId, guildId) {
    const record = await PSNLink.findOne({ userId, guildId });
    return record?.psnId || null;
  },

  async getAllLinks() {
    return await PSNLink.find();
  }
};
