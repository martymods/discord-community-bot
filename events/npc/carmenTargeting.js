// 📦 events/npc/carmenTargeting.js
const fs = require('fs');
const path = require('path');

const TARGETS_PATH = path.join(__dirname, 'player_profiles/carmen_targets');
if (!fs.existsSync(TARGETS_PATH)) fs.mkdirSync(TARGETS_PATH, { recursive: true });

function getTargetPath(userId) {
  return path.join(TARGETS_PATH, `${userId}.json`);
}

function readCarmenTarget(userId) {
  const file = getTargetPath(userId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch (err) {
    console.error('❌ Failed to read Carmen target file:', err);
    return null;
  }
}

function updateCarmenTarget(userId, newData = {}) {
  const file = getTargetPath(userId);
  let existing = {};

  if (fs.existsSync(file)) {
    try {
      existing = JSON.parse(fs.readFileSync(file));
    } catch (err) {
      console.error('❌ Failed to parse existing Carmen target file:', err);
    }
  }

  const updated = {
    ...existing,
    ...newData,
    affection: (existing.affection || 0) + 1,
    lastSeen: new Date().toISOString()
  };

  fs.writeFileSync(file, JSON.stringify(updated, null, 2));
  return updated;
}

module.exports = {
  readCarmenTarget,
  updateCarmenTarget
};
