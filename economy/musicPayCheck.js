const MusicOrders = require('../musicorders.js'); // fixed path

async function hasPaidForSubmission(userId, guildId) {
  const order = await MusicOrders.findOne({ userId, guildId });
  return !!order;
}

module.exports = { hasPaidForSubmission };
