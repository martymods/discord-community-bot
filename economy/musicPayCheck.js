const MusicOrders = require('../models/musicorders.js');

async function hasPaidForSubmission(userId, guildId) {
  const order = await MusicOrders.findOne({ userId, guildId });
  return !!order;
}

module.exports = { hasPaidForSubmission };
