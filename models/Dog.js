// 📦 Updated models/Dog.js (MongoDB Schema)
const mongoose = require('../utils/localMongoose');

const dogSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  name: { type: String, default: null },
  breed: String,
  hp: { type: Number, default: 100 },
  mood: { type: String, default: 'Happy' },
  cooldown: { type: Number, default: 0 },
  feedCount: { type: Number, default: 0 }, // For 5 feeds before cooldown
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  expNeeded: { type: Number, default: 100 },
  defenseCount: { type: Number, default: 0 },
  stats: {
    def: { type: Number, default: 5 },
    pow: { type: Number, default: 0 },
    dex: { type: Number, default: 0 },
    mind: { type: Number, default: 0 },
    iq: { type: Number, default: 0 },
    sync: { type: Number, default: 100 }
  },
  statExp: {
    def: { type: Number, default: 0 },
    pow: { type: Number, default: 0 },
    dex: { type: Number, default: 0 },
    mind: { type: Number, default: 0 },
    iq: { type: Number, default: 0 }
  }
});

module.exports = mongoose.model('Dog', dogSchema);
