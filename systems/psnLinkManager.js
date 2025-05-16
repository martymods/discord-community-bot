const mongoose = require('mongoose');

const psnSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  psnId: String
});

const PSNLink = mongoose.model('PSNLink', psnSchema);

async function setPSN(userId, guildId, psnId) {
  await PSNLink.findOneAndUpdate(
    { userId, guildId },
    { psnId },
    { upsert: true, new: true }
  );
}

async function getPSN(userId, guildId) {
  const record = await PSNLink.findOne({ userId, guildId });
  return record?.psnId || null;
}

async function getAllLinks() {
  return await PSNLink.find();
}

async function removePSN(userId, guildId) {
  await PSNLink.deleteOne({ userId, guildId });
}

module.exports = {
  setPSN,
  getPSN,
  getAllLinks,
  removePSN
};
