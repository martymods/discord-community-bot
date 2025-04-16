const MusicOrders = require('./models/MusicOrders'); // make sure this is CJS too

async function hasPaidForSubmission(userId, guildId) {
  const order = await MusicOrders.findOne({ userId, guildId });
  return !!order;
}

module.exports = { hasPaidForSubmission };
