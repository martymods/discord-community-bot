// ✅ Final economy/shop.js with getRotatingShop and refreshShop()

let rotatingShop = [];

const fullItemPool = [
// 🌱 Weed Seeds
{ id: 'weed_seed_0', name: 'Bush Weed', price: 25, emoji: '🌱', stock: 10, description: 'Basic seed, 1 yield' },
{ id: 'weed_seed_3', name: 'Mango Kush', price: 50, emoji: '🌿', stock: 8, description: 'Medium seed, 2 yield' },
{ id: 'weed_seed_6', name: 'Purple', price: 75, emoji: '🌾', stock: 6, description: 'Good seed, 3 yield' },
{ id: 'weed_seed_9', name: 'Amnesia', price: 100, emoji: '🍁', stock: 4, description: 'Strong seed, 4 yield' },
{ id: 'weed_seed_11', name: 'Passion Fashion', price: 150, emoji: '💎', stock: 2, description: 'Best seed, 5 yield' },

// 🪴 Pots
{ id: 'weed_pot_0', name: 'Cheap Pot', price: 30, emoji: '🪴', stock: 10, description: 'Slowest growth' },
{ id: 'weed_pot_1', name: 'Standard Pot', price: 75, emoji: '🪴', stock: 6, description: 'Medium growth' },
{ id: 'weed_pot_2', name: 'Premium Pot', price: 120, emoji: '🪴', stock: 3, description: 'Fastest growth' },

// 💧 Water (used for watering plants)
{ id: 'water_0', name: 'Water Bottle', price: 5, emoji: '💧', stock: 20, description: 'Used to water your plant once.' },
{ id: 'water_1', name: '24x Water Pack', price: 90, emoji: '💧', stock: 10, description: 'Bulk water. Lasts longer.' },
{ id: 'water_2', name: '60x Water Pack', price: 200, emoji: '💧', stock: 5, description: 'Enough to last a full grow cycle.' },

// 🌾 Fertilizer (speeds up growth)
{ id: 'weed_fert_0', name: 'Fertilizer Booster', price: 20, emoji: '🌾', stock: 15, description: 'Slightly boosts plant growth.' },
{ id: 'weed_fert_1', name: 'Fertilizer Hydro', price: 50, emoji: '🌾', stock: 10, description: 'Moderate growth boost.' },
{ id: 'weed_fert_2', name: 'Fertilizer Nitro', price: 100, emoji: '🌾', stock: 6, description: 'Strong growth acceleration.' },
{ id: 'weed_fert_3', name: 'Fertilizer Titanium', price: 150, emoji: '🌾', stock: 3, description: 'Max growth speed. Ultra potent.' },




  {
    id: 'gem', name: '💎 Gem', value: 100, levelRequired: 0,
    stock: Infinity, weight: 10,
    description: 'Use to gain $100 DreamworldPoints each.'
  },
  {
    id: 'medal', name: '🎖️ Medal', value: 50, levelRequired: 0,
    stock: Infinity, weight: 10,
    description: 'Trade in for quick Dreamworld cash.'
  },
  {
    id: 'dice', name: '🎲 Dice', value: 25, levelRequired: 0,
    stock: Infinity, weight: 8,
    description: 'Roll for random XP gains.'
  },
  {
    id: 'skull', name: '💀 Skull Ring', value: 1000, levelRequired: 20,
    stock: Infinity, weight: 4,
    description: 'Reduces robbery cooldown by 2 minutes.'
  },
  {
    id: 'crown', name: '👑 Crown', value: 500, levelRequired: 10,
    stock: Infinity, weight: 5,
    description: 'Symbol of status. Currently cosmetic.'
  },
  {
    id: 'smoke', name: '💨 Smoke Bomb', value: 150, levelRequired: 2,
    stock: Infinity, weight: 7,
    description: 'Used to escape a robbery attempt.'
  },
  {
    id: 'treat_def', name: 'Defense Treat', value: 300, levelRequired: 0,
    stock: 20, weight: 6,
    description: 'Boosts your dog’s 🛡️ DEF stat.'
  },
  {
    id: 'treat_dex', name: 'Dex Treat', value: 300, levelRequired: 0,
    stock: 10, weight: 6,
    description: 'Boosts your dog’s 🎯 DEX stat.'
  }
];

function weightedSample(pool, count) {
  const result = [];
  const used = new Set();

  while (result.length < count && used.size < pool.length) {
    const totalWeight = pool.reduce((sum, item) => used.has(item.id) ? sum : sum + item.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const item of pool) {
      if (used.has(item.id)) continue;
      roll -= item.weight;
      if (roll <= 0) {
        result.push(item);
        used.add(item.id);
        break;
      }
    }
  }

  return result;
}

function refreshShop() {
  const itemsToShow = 5;
  const selection = weightedSample(fullItemPool, itemsToShow);

  // 🛒 Assign randomized stock (1–10)
  rotatingShop = selection.map(item => ({
    ...item,
    stock: Math.floor(Math.random() * 10) + 1 // 1 to 10 stock per item
  }));

  global.lastShopRefresh = Date.now();

  console.log("🔁 Rotating Shop Items:");
  for (const item of rotatingShop) {
    console.log(` - ${item.name} ($${item.value}) | Level: ${item.levelRequired} | Stock: ${item.stock}`);
  }
}


function getRotatingShop() {
  return rotatingShop;
}

module.exports = {
  getRotatingShop,
  refreshShop,
  shopItems: fullItemPool
};
