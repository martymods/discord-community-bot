const mongoose = require('../utils/localMongoose');

const activityProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  totalCashAwarded: { type: Number, default: 0 },
  totalXpAwarded: { type: Number, default: 0 },
  unlocks: { type: [String], default: [] },
  lastAwardAt: { type: Date, default: () => new Date() },
  username: { type: String, default: '' },
  avatar: { type: String, default: '' }
});

const ActivityProgress = mongoose.model('ActivityProgress', activityProgressSchema);

ActivityProgress.recordAward = async function recordAward({
  userId,
  guildId,
  cash = 0,
  xp = 0,
  unlocks = [],
  username,
  avatar
}) {
  if (!userId || !guildId) {
    throw new Error('userId and guildId are required');
  }

  let doc = await ActivityProgress.findOne({ userId, guildId });
  if (!doc) {
    doc = await ActivityProgress.create({ userId, guildId });
  }

  doc.totalCashAwarded = (doc.totalCashAwarded || 0) + cash;
  doc.totalXpAwarded = (doc.totalXpAwarded || 0) + xp;
  doc.lastAwardAt = new Date();

  if (!Array.isArray(doc.unlocks)) {
    doc.unlocks = [];
  }

  if (Array.isArray(unlocks) && unlocks.length) {
    const current = new Set(doc.unlocks);
    for (const key of unlocks) {
      if (typeof key === 'string' && key.trim().length) {
        current.add(key);
      }
    }
    doc.unlocks = Array.from(current.values());
  }

  if (typeof username === 'string' && username.trim().length) {
    doc.username = username.trim().slice(0, 64);
  }

  if (typeof avatar === 'string' && avatar.startsWith('http')) {
    doc.avatar = avatar;
  }

  await doc.save();
  return doc;
};

module.exports = ActivityProgress;
