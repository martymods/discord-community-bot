// 🚔 prisonSystem.js — Full logic patch to enforce 1hr prison, stash wipe, command blocking, and increased steal success

const prisonUsers = new Map(); // userId => timestamp
const riotFails = new Map();
const riotWins = new Map();
const smuggleWins = new Map();
const prisonRats = new Map();

const disabledWhileInPrison = ['hideout', 'gambleitem', 'scavenge', 'heal', 'buyitem', 'challenge', 'use', 'deal', 'steal', 'gabmle', 'lurk'];

function sendToPrison(userId, guildId) {
  prisonUsers.set(userId, Date.now() + 3600000); // 1 hour sentence

  // ⛓️ Wipe stash
  const Inventory = require('./economy/inventory');
  Inventory.findOneAndUpdate({ userId, guildId }, { $set: { stash: 0 } }).catch(() => {});

  // ⛓️ Clear hideout
  if (global.hideoutMap?.has(userId)) global.hideoutMap.delete(userId);

  // 📉 Log drama
  const Drama = require('./economy/drama');
  Drama.create({
    type: 'prison',
    message: `<@${userId}> was locked up and lost their stash.`,
    date: new Date()
  });

  // Optional: log stat resets
  if (riotFails.has(userId)) riotFails.set(userId, riotFails.get(userId) + 1);
  else riotFails.set(userId, 1);
}

function isInPrison(userId) {
  return prisonUsers.has(userId) && prisonUsers.get(userId) > Date.now();
}

function clearPrison(userId) {
  prisonUsers.delete(userId);
}

function logRiotSuccess(userId) {
  const wins = riotWins.get(userId) || 0;
  riotWins.set(userId, wins + 1);
}

function logSmuggleSuccess(userId) {
  const wins = smuggleWins.get(userId) || 0;
  smuggleWins.set(userId, wins + 1);
}

function logRatTarget(userId, victimId) {
  prisonRats.set(userId, victimId);
}

// 🔐 Lawyer System
const lawyerMap = new Map(); // userId => expiration timestamp

function retainLawyer(userId, hours = 1) {
  const now = Date.now();
  const expires = now + hours * 60 * 60 * 1000;
  lawyerMap.set(userId, expires);
}

function hasLawyer(userId) {
  const expires = lawyerMap.get(userId);
  return expires && expires > Date.now();
}


module.exports = {
  sendToPrison,
  isInPrison,
  clearPrison,
  disabledWhileInPrison,
  prisonUsers,
  riotFails,
  riotWins,
  smuggleWins,
  prisonRats,
  logRiotSuccess,
  logSmuggleSuccess,
  logRatTarget,
  retainLawyer,   // ✅ ADD THIS
  hasLawyer       // ✅ AND THIS TOO
};
