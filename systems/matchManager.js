const mongoose = require('../utils/localMongoose');
const { v4: uuidv4 } = require('uuid');

const matchSchema = new mongoose.Schema({
  matchId: { type: String, unique: true },
  guildId: String,
  challengerId: String,
  opponentId: String,
  bet: Number,
  status: { type: String, default: 'pending' },
  winnerId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null }
});

const Match = mongoose.model('Match', matchSchema);

async function createMatch({ guildId, challengerId, opponentId, bet }) {
  const matchId = uuidv4();

  const match = await Match.create({
    matchId,
    guildId,
    challengerId,
    opponentId,
    bet
  });

  return match;
}

async function resolveMatch(matchId, winnerId) {
  const match = await Match.findOne({ matchId });
  if (!match || match.status !== 'pending') return null;

  match.status = 'resolved';
  match.winnerId = winnerId;
  match.resolvedAt = new Date();
  await match.save();

  return match;
}

async function getActiveMatches() {
  return await Match.find({ status: 'pending' });
}

async function getMatchByPlayer(userId) {
  return await Match.findOne({
    status: 'pending',
    $or: [
      { challengerId: userId },
      { opponentId: userId }
    ]
  });
}

module.exports = {
  createMatch,
  resolveMatch,
  getActiveMatches,
  getMatchByPlayer
};
