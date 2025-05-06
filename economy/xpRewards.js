const mongoose = require('mongoose');

const xpSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
});

const XP = mongoose.model('XP', xpSchema);

function xpFor(level) {
  return 5 * (level ** 2) + 50 * level + 100;
}

module.exports = {
  async appendXp(userId, guildId, amount) {
    let user = await XP.findOne({ userId, guildId });
    if (!user) user = await XP.create({ userId, guildId });

    user.xp += amount;
    while (user.xp >= xpFor(user.level + 1)) {
      user.level += 1;
    }

    await user.save();
    return { xp: user.xp, level: user.level };
  },

  async fetch(userId, guildId) {
    return await XP.findOne({ userId, guildId });
  },

  async fetchLevel(userId, guildId) {
    const user = await XP.findOne({ userId, guildId });
    return user?.level || 1;
  },

  xpFor,

  async fetchLeaderboard(guildId, limit = 5) {
    return await XP.find({ guildId }).sort({ level: -1, xp: -1 }).limit(limit);
  },

  async computeLeaderboard(client, raw, withUsernames = true) {
    const lb = [];

    for (let i = 0; i < raw.length; i++) {
      const e = raw[i];
      let username = 'Unknown';
      if (withUsernames) {
        const user = await client.users.fetch(e.userId).catch(() => null);
        if (user) username = user.username;
      }

      lb.push({
        guildId: e.guildId,
        userId: e.userId,
        xp: e.xp,
        level: e.level,
        position: i + 1,
        username
      });
    }

    return lb;
  }
};
