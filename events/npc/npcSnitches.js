// 🕵️‍♂️ NPC Snitch System
const npcSnitchMap = new Map(); // userId => { warnings: number, lastTrigger: timestamp }

function checkSnitchTrigger(userId, salesCount, moodMap, heatMap) {
  if (salesCount < 5) return; // Must have sold at least 5 times

  const record = npcSnitchMap.get(userId) || { warnings: 0, lastTrigger: 0 };
  const now = Date.now();

  // Cooldown of 30 minutes before the snitch can act again
  if (now - record.lastTrigger < 1800000) return;

  const chance = Math.random();
  const mood = moodMap.get(userId) || 0;
  const baseChance = 0.2 + (mood < 0 ? 0.2 : 0); // higher chance if mood is bad

  if (chance < baseChance) {
    record.warnings += 1;
    record.lastTrigger = now;
    npcSnitchMap.set(userId, record);

    const userHeat = heatMap.get(userId) || { heat: 0, lastActivity: now };
    userHeat.heat += 2; // Add 2 police level (heat)
    userHeat.lastActivity = now;
    heatMap.set(userId, userHeat);

    return {
      warned: true,
      message: `🕵️‍♂️ I saw that deal. Be careful who you trust... (Heat +2)`,
      profileImage: selectSnitchImage(userId)
    };
  }

  return { warned: false };
}

function selectSnitchImage(userId) {
  const tags = ['acid', 'heroin', 'meth', 'shrooms', 'weed'];
  const tag = tags[Math.floor(Math.random() * tags.length)];
  return `public/sharedphotos/snitch_${tag}_0.png`;
}

function getSnitchQuantity() {
  return Math.floor(Math.random() * 8) + 3; // 3 to 10 units
}

module.exports = {
  checkSnitchTrigger,
  selectSnitchImage,
  getSnitchQuantity
};
