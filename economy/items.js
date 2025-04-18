const items = [
    { id: 'vest', name: '🧥 Reflective Vest', value: 300, rarity: 'Rare', levelRequired: 4, chance: 0.08 },
    { id: 'smoke', name: '💨 Smoke Bomb', value: 150, rarity: 'Uncommon', levelRequired: 2, chance: 0.12 },
    { name: '💎 Gem', id: 'gem', value: 100, rarity: 'Common', levelRequired: 0, chance: 0.3 },
    { name: '🎖️ Medal', id: 'medal', value: 50, rarity: 'Common', levelRequired: 0, chance: 0.2 },
    { name: '🎲 Dice', id: 'dice', value: 25, rarity: 'Rare', levelRequired: 0, chance: 0.1 },
    { name: '👑 Crown', id: 'crown', value: 500, rarity: 'Epic', levelRequired: 10, chance: 0.05 },
    { name: '💀 Skull Ring', id: 'skull', value: 1000, rarity: 'Legendary', levelRequired: 20, chance: 0.01 },
    { name: '🎭 Disguise Kit', id: 'disguise', value: 300, rarity: 'Rare', levelRequired: 0, chance: 0.05 },
    { name: '🏠 Extended Lease', id: 'lease', value: 500, rarity: 'Epic', levelRequired: 0, chance: 0.03 }
  ];
  
  module.exports = {
    items,
  
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
  
