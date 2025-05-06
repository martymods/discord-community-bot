// npcReputation.js — Phase 7: Reputation Tracking System
const npcReputation = new Map(); // Key: `${userId}_${npcName}` → rep points

const tiers = [
  { threshold: 0, label: '❓ Unknown', color: '#888888' },
  { threshold: 5, label: '🤝 Acquaintance', color: '#cccccc' },
  { threshold: 15, label: '🎯 Reliable Seller', color: '#33cc33' },
  { threshold: 30, label: '💼 Neighborhood Plug', color: '#0099ff' },
  { threshold: 50, label: '💎 Trusted Plug', color: '#9933ff' },
  { threshold: 75, label: '👑 Street Royalty', color: '#ffcc00' },
  { threshold: 100, label: '🔥 LEGENDARY', color: '#ff3300' }
];

// ✅ Add reputation points
function adjustReputation(userId, npcName, amount) {
  const key = `${userId}_${npcName}`;
  const current = npcReputation.get(key) || 0;
  npcReputation.set(key, current + amount);
}

// ✅ Get total points
function getReputation(userId, npcName) {
  const key = `${userId}_${npcName}`;
  return npcReputation.get(key) || 0;
}

// ✅ Get tier label (like 💼 Trusted Plug)
function getReputationRank(repPoints) {
  return tiers
    .slice()
    .reverse()
    .find(t => repPoints >= t.threshold)?.label || '❓ Unknown';
}

// ✅ Get footer for embeds
function getReputationFooter(userId, npcName) {
  const rep = getReputation(userId, npcName);
  const tier = getReputationRank(rep);
  return `📊 Reputation with ${npcName}: ${tier} (${rep})`;
}

// 🧠 Buyer Mood System (Phase 8)
const buyerMoods = new Map(); // Key: `${userId}_${npcName}` → '😐' etc.

function updateMood(userId, npcName, change = 0) {
  const key = `${userId}_${npcName}`;
  let mood = buyerMoods.get(key) || '😐';

  const moodScale = ['😐', '😊', '😡', '😈', '💀'];
  let index = moodScale.indexOf(mood);
  index = Math.max(0, Math.min(moodScale.length - 1, index + change));
  buyerMoods.set(key, moodScale[index]);
}

function getMood(userId, npcName) {
  const key = `${userId}_${npcName}`;
  return buyerMoods.get(key) || '😐';
}

function isBlocked(userId, npcName) {
    const mood = getMood(userId, npcName);
    return mood === '💀'; // Block if the mood is skull
  }
  

function getMoodEffect(mood) {
  switch (mood) {
    case '😊': return 1.1;   // +10%
    case '😡': return 0.9;   // -10%
    case '😈': return 0.8;   // -20%
    case '💀': return 0.6;   // -40%
    default: return 1.0;     // neutral
  }
}



module.exports = {
    adjustReputation,
    getReputation,
    getReputationRank,
    getReputationFooter,
    updateMood,
    getMood,
    getMoodEffect,
    isBlocked // ✅ ADD THIS
  };
  
