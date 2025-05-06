// dogSystem.js
const Dog = require('../../../models/Dog');

// Stat thresholds for perks
const statPerks = {
  DEF: { threshold: 10, effect: 'Guard Aura' },
  POW: { threshold: 10, effect: 'Intimidation' },
  DEX: { threshold: 12, effect: 'Quick Bark' },
  MIND: { threshold: 10, effect: 'Psychic Bond' },
  IQ: { threshold: 100, effect: 'Trap Setter' },
  SYNC: { threshold: 100, effect: 'Ultra Sync' }
};

// Map of all dog stages and images
const dogImageMap = {
  pitbull: {
    idle: {
      puppy: 'public/sharedphotos/pb__puppy_idle_0.png',
      teen: 'public/sharedphotos/pb__teen_idle_0.png',
      adult: 'public/sharedphotos/pb__adult_idle_0.png'
    },
    attack: 'public/sharedphotos/pb__normal_attack_0.png',
    death: 'public/sharedphotos/pb__state_dead_0.png'
  },
  shepherd: {
    idle: {
      puppy: 'public/sharedphotos/gs__puppy_idle_0.png',
      teen: 'public/sharedphotos/gs__teen_idle_0.png',
      adult: 'public/sharedphotos/gs__adult_idle_0.png'
    },
    attack: 'public/sharedphotos/gs__normal_attack_0.png',
    death: 'public/sharedphotos/gs__state_dead_0.png'
  },
  pomeranian: {
    idle: {
      puppy: 'public/sharedphotos/p__puppy_idle_0.png',
      teen: 'public/sharedphotos/p__teen_idle_0.png',
      adult: 'public/sharedphotos/p__adult_idle_0.png'
    },
    attack: 'public/sharedphotos/p__normal_attack_0.png',
    death: 'public/sharedphotos/p__state_dead_0.png'
  }
};

async function getDog(userId, guildId) {
  console.log(`🐾 Fetching dog from DB for user: ${userId} guild: ${guildId}`);
  const dog = await Dog.findOne({ userId, guildId });
  if (!dog) {
    console.log('❌ No dog found in DB for this user.');
    return null;
  }

  // Attach active perks
  dog.perks = [];
  for (const stat in statPerks) {
    const value = (dog.stats?.[stat] || 0);
    if (value >= statPerks[stat].threshold) {
      dog.perks.push(statPerks[stat].effect);
    }
  }

  console.log('✅ Dog found:', dog);
  return dog;
}

async function setDog(userId, guildId, dogData) {
  const existing = await Dog.findOne({ userId, guildId });
  if (existing) {
    Object.assign(existing, dogData);
    await existing.save();
    console.log('📦 Dog updated in DB for:', userId);
  } else {
    const newDog = new Dog({ ...dogData, userId, guildId });
    await newDog.save();
    console.log('✅ Dog saved to DB for:', userId);
  }
}

async function tryDogDefense(userId, guildId) {
  const dog = await getDog(userId, guildId);
  if (!dog || dog.cooldown > Date.now() || dog.hp <= 0) return false;

  // Passive perk check: Trap Setter
  const hasTrap = (dog.stats?.IQ || 0) >= 100 && Math.random() < 0.1;
  if (hasTrap) {
    dog.hp -= 10;
    dog.cooldown = Date.now() + 15 * 60 * 1000;
    await dog.save();
    return 'trap'; // return custom trap result
  }

  console.log(`🐕 Dog Defense Triggered | HP: ${dog.hp} | Mood: ${dog.mood}`);

  dog.hp -= 25;
  dog.mood = dog.hp > 50 ? 'Alerted' : 'Injured';
  dog.cooldown = Date.now() + 15 * 60 * 1000;

  if (!dog.defenseCount) dog.defenseCount = 0;
  dog.defenseCount++;

  // Level Up Logic
  if (dog.defenseCount % 3 === 0) {
    dog.level++;
    dog.hp = Math.min(100, dog.hp + 20);
    dog.mood = 'Happy';
    console.log(`🎉 Dog Leveled Up to ${dog.level}`);
  }

  await dog.save();
  return true;
}

async function updateDogAfterDefense(userId, guildId) {
  const dog = await getDog(userId, guildId);
  if (!dog) return;
  dog.cooldown = Date.now() + 15 * 60 * 1000;
  dog.hp = Math.max(0, dog.hp - 25);
  dog.mood = dog.hp > 50 ? 'Alerted' : 'Injured';
  await dog.save();
}

async function updateDogName(userId, guildId, name) {
  const dog = await Dog.findOne({ userId, guildId });
  if (!dog) return null;
  dog.name = name;
  return dog.save();
}

function getDogStage(level) {
  if (level < 15) return 'puppy';
  if (level < 35) return 'teen';
  return 'adult';
}

function getDogImage(breed, level, action = 'idle') {
  let stage;
  if (level >= 35) stage = 'adult';
  else if (level >= 15) stage = 'teen';
  else stage = 'puppy';

  let baseName = '';

  if (breed === 'pitbull') baseName = 'pb';
  else if (breed === 'shepherd') baseName = 'gs';
  else if (breed === 'pomeranian') baseName = 'p';

  if (!baseName) return null;

  if (action === 'attack') {
    return `https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/${baseName}__normal_attack_0.png`;
  } else if (action === 'death') {
    return `https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/${baseName}__state_dead_0.png`;
  } else {
    return `https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/${baseName}__${stage}_idle_0.png`;
  }
}


module.exports = {
  getDog,
  getDogFromDB: getDog, // ✅ Add this line
  setDog,
  tryDogDefense,
  updateDogAfterDefense,
  updateDogName,
  statPerks,
  getDogImage
};
