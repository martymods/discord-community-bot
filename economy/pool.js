const mongoose = require('../utils/localMongoose');

const poolSchema = new mongoose.Schema({
  guildId: String,
  pool: { type: Number, default: 3000 },
  lastDraw: { type: Date, default: new Date() }
});

module.exports = mongoose.model('LotteryPool', poolSchema);
