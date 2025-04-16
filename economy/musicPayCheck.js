const MusicOrders = require('./models/MusicOrders'); // new MongoDB schema

async function hasPaidForSubmission(userId, guildId) {
  const order = await MusicOrders.findOne({ userId, guildId });
  return !!order;
}

module.exports = { hasPaidForSubmission };

await MusicOrders.create({
    userId: customerDiscordId,
    guildId: guildId
  });
  