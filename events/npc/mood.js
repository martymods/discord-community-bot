// events/npc/mood.js
const moodMap = new Map(); // key: `${userId}_${npcName}`

function getMoodKey(userId, npc) {
  return `${userId}_${npc}`;
}

function getMood(userId, npc) {
  const key = getMoodKey(userId, npc);
  return moodMap.get(key) || 0;
}

function adjustMood(userId, npc, amount) {
  const key = getMoodKey(userId, npc);
  const current = moodMap.get(key) || 0;
  moodMap.set(key, current + amount);
}

function getMoodEffect(mood) {
  if (mood >= 5) return 1.2; // Friendly
  if (mood <= -5) return 0.6; // Suspicious
  return 1.0;
}

function isMoodCritical(userId, npc) {
    return getMood(userId, npc) <= -10;
  }
  

// Optional decay logic
setInterval(() => {
  for (const [key, value] of moodMap.entries()) {
    if (value > 0) moodMap.set(key, value - 1);
    else if (value < 0) moodMap.set(key, value + 1);
  }
}, 10 * 60 * 1000); // every 10 minutes

module.exports = {
  isMoodCritical,
  getMood,
  adjustMood,
  getMoodEffect
};
