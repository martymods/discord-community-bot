const { v4: uuidv4 } = require('uuid');

const activeMatches = new Map(); // In-memory for now, MongoDB optional

function createMatch({ guildId, challengerId, opponentId, bet }) {
  const matchId = uuidv4();

  const match = {
    matchId,
    guildId,
    challengerId,
    opponentId,
    bet,
    status: 'pending',
    createdAt: Date.now()
  };

  activeMatches.set(matchId, match);
  return match;
}

function resolveMatch(matchId, winnerId) {
  const match = activeMatches.get(matchId);
  if (!match || match.status !== 'pending') return null;

  match.winnerId = winnerId;
  match.status = 'resolved';
  match.resolvedAt = Date.now();

  return match;
}

function getActiveMatches() {
  return Array.from(activeMatches.values()).filter(m => m.status === 'pending');
}

function getMatchByPlayer(userId) {
  return Array.from(activeMatches.values()).find(m =>
    m.challengerId === userId || m.opponentId === userId
  );
}

module.exports = {
  createMatch,
  resolveMatch,
  getActiveMatches,
  getMatchByPlayer
};
 