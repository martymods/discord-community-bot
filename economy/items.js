const items = [
// 🌱 Farming Items — Seeds
{
  id: 'weed_seed_0',
  name: '🌱 Bush Weed',
  value: 50,
  price: 250,
  rarity: 'Common',
  description: 'Basic seed, 1 yield',
  stock: 10,
  usable: false
},
{
  id: 'weed_seed_3',
  name: '🌱 Mango Kush',
  value: 100,
  price: 500,
  rarity: 'Uncommon',
  description: 'Medium seed, 2 yield',
  stock: 8,
  usable: false
},
{
  id: 'weed_seed_6',
  name: '🌱 Purple',
  value: 200,
  price: 705,
  rarity: 'Rare',
  description: 'Good seed, 3 yield',
  stock: 6,
  usable: false
},
{
  id: 'weed_seed_9',
  name: '🌱 Amnesia',
  value: 250,
  price: 100,
  rarity: 'Epic',
  description: 'Strong seed, 4 yield',
  stock: 4,
  usable: false
},
{
  id: 'weed_seed_11',
  name: '🌱 Passion Fashion',
  value: 400,
  price: 1500,
  rarity: 'Legendary',
  description: 'Best seed, 5 yield',
  stock: 2,
  usable: false
},

// 🪴 Pots
{
  id: 'weed_pot_0',
  name: '🏺 Cheap Pot',
  value: 1,
  price: 30,
  rarity: 'Common',
  description: 'Slowest growth',
  stock: 10,
  usable: false
},
{
  id: 'weed_pot_1',
  name: '🏺 Standard Pot',
  value: 2,
  price: 75,
  rarity: 'Uncommon',
  description: 'Medium growth',
  stock: 6,
  usable: false
},
{
  id: 'weed_pot_2',
  name: '🏺 Premium Pot',
  value: 3,
  price: 120,
  rarity: 'Rare',
  description: 'Fastest growth',
  stock: 3,
  usable: false
},

// 💧 Water
{
  id: 'water_0',
  name: '💧 Water Bottle',
  value: 1,
  price: 5,
  rarity: 'Common',
  description: 'Used to water your plant once.',
  stock: 20,
  usable: false
},
{
  id: 'water_1',
  name: '💧 24x Water Pack',
  value: 24,
  price: 90,
  rarity: 'Uncommon',
  description: 'Bulk water. Lasts longer.',
  stock: 10,
  usable: false
},
{
  id: 'water_2',
  name: '💧 60x Water Pack',
  value: 60,
  price: 200,
  rarity: 'Rare',
  description: 'Enough to last a full grow cycle.',
  stock: 5,
  usable: false
},

// 🌾 Fertilizer
{
  id: 'weed_fert_0',
  name: '💩 Fertilizer Booster',
  value: 1,
  price: 20,
  rarity: 'Common',
  description: 'Slightly boosts plant growth.',
  stock: 15,
  usable: false
},
{
  id: 'weed_fert_1',
  name: '💩 Fertilizer Hydro',
  value: 2,
  price: 50,
  rarity: 'Uncommon',
  description: 'Moderate growth boost.',
  stock: 10,
  usable: false
},
{
  id: 'weed_fert_2',
  name: '💩 Fertilizer Nitro',
  value: 3,
  price: 100,
  rarity: 'Rare',
  description: 'Strong growth acceleration.',
  stock: 6,
  usable: false
},
{
  id: 'weed_fert_3',
  name: '💩 Fertilizer Titanium',
  value: 4,
  price: 150,
  rarity: 'Epic',
  description: 'Max growth speed. Ultra potent.',
  stock: 3,
  usable: false
},

         // DOG TREATS
    {
      id: 'treat_def',
      name: '🍖 Defense Treat',
      rarity: 'Common',
      description: 'Boosts your dog\'s 🛡️ DEF stat.',
      price: 200,
      type: 'dog_treat',
      stock: 20,
      value: 250, // 🔥 Add this
      hp: 30 // 🟢 Adds 30 HP
    },
    {
      id: 'treat_pow',
      name: '🍖 Power Treat',
      rarity: 'Uncommon',
      description: 'Boosts your dog\'s 💪 POW stat.',
      price: 300,
      type: 'dog_treat',
      stock: 15,
      value: 250, // 🔥 Add this
      hp: 150 // 🟢 Adds 60 HP
    },
    {
      id: 'treat_dex',
      name: '🍖 Dex Treat',
      rarity: 'Rare',
      description: 'Boosts your dog\'s 🎯 DEX stat.',
      price: 400,
      type: 'dog_treat',
      stock: 10,
      value: 250, // 🔥 Add this
      hp: 60 // 🟢 Adds 90 HP
    },
    {
      id: 'treat_mind',
      name: '🍖 Mind Treat',
      rarity: 'Epic',
      description: 'Boosts your dog\'s 🧠 MIND stat.',
      price: 500,
      type: 'dog_treat',
      stock: 10,
      value: 250, // 🔥 Add this
      hp: 90 // 🟢 Adds 120 HP
    },
    {
      id: 'vest',
      name: '🧥 Reflective Vest',
      value: 300,
      price: 300,
      rarity: 'Rare',
      levelRequired: 4,
      chance: 0.07,
      description: 'Blocks half the damage from a robbery once.',
      stock: 5,
      usable: true
    },
    {
      id: 'smoke',
      name: '💨 Smoke Bomb',
      value: 150,
      price: 150,
      rarity: 'Uncommon',
      levelRequired: 2,
      chance: 0.12,
      description: 'Used to escape a robbery attempt.'
    },
    {
      id: 'gem',
      name: '💎 Gem',
      value: 100,
      price: 100,
      rarity: 'Common',
      levelRequired: 0,
      chance: 0.08,
      description: 'Use to gain $100 DreamworldPoints each.',
      usable: true
    },
    {
      id: 'medal',
      name: '🎖️ Medal',
      value: 50,
      price: 50,
      rarity: 'Common',
      levelRequired: 0,
      chance: 0.1,
      description: 'Trade in for quick Dreamworld cash.',
      usable: true
    },
    {
      id: 'dice',
      name: '🎲 Dice',
      value: 25,
      price: 25,
      rarity: 'Rare',
      levelRequired: 0,
      chance: 0.1,
      description: 'Roll for random XP gains.',
      usable: true
    },
    {
      id: 'crown',
      name: '👑 Crown',
      value: 500,
      price: 500,
      rarity: 'Epic',
      levelRequired: 10,
      chance: 0.05,
      description: 'Symbol of status. Currently cosmetic.'
    },
    {
      id: 'skull',
      name: '💀 Skull Ring',
      value: 1000,
      price: 1000,
      rarity: 'Legendary',
      levelRequired: 20,
      chance: 0.01,
      description: 'Reduces robbery cooldown by 2 minutes.',
      usable: true
    },
    {
      id: 'disguise',
      name: '🎭 Disguise Kit',
      value: 300,
      price: 300,
      rarity: 'Rare',
      levelRequired: 0,
      chance: 0.05,
      description: 'Use to hide from PvP crimes for 5 minutes.',
      usable: true
    },
    {
      id: 'lease',
      name: '🏠 Extended Lease',
      value: 500,
      price: 500,
      rarity: 'Epic',
      levelRequired: 0,
      chance: 0.02,
      description: 'Extend your hideout protection by 10 minutes.',
      usable: true
    }
  ];

  function reduceItemStock(itemId, qty = 1) {
    const item = items.find(i => i.id === itemId);
    if (!item || item.stock == null) return false; // Unlimited stock or not found
  
    if (item.stock < qty) return false;
    item.stock -= qty;
    return true;
  }
  
  
  module.exports = {
    items,
    reduceItemStock,
    
    getRandomItem() {
      const roll = Math.random();
      let cumulativeChance = 0;
      for (const item of items) {
        cumulativeChance += item.chance;
        if (roll <= cumulativeChance) return item;
      }
      return null; // No drop
    }
  };
  
