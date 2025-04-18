const items = [
    {
      id: 'vest',
      name: '🧥 Reflective Vest',
      value: 300,
      rarity: 'Rare',
      levelRequired: 4,
      chance: 0.07,
      description: 'Blocks half the damage from a robbery once.'
    },
    {
      id: 'smoke',
      name: '💨 Smoke Bomb',
      value: 150,
      rarity: 'Uncommon',
      levelRequired: 2,
      chance: 0.12,
      description: 'Used to escape a robbery attempt.'
    },
    {
      id: 'gem',
      name: '💎 Gem',
      value: 100,
      rarity: 'Common',
      levelRequired: 0,
      chance: 0.08,
      description: 'Use to gain $100 DreamworldPoints each.'
    },
    {
      id: 'medal',
      name: '🎖️ Medal',
      value: 50,
      rarity: 'Common',
      levelRequired: 0,
      chance: 0.1,
      description: 'Trade in for quick Dreamworld cash.'
    },
    {
      id: 'dice',
      name: '🎲 Dice',
      value: 25,
      rarity: 'Rare',
      levelRequired: 0,
      chance: 0.1,
      description: 'Roll for random XP gains.'
    },
    {
      id: 'crown',
      name: '👑 Crown',
      value: 500,
      rarity: 'Epic',
      levelRequired: 10,
      chance: 0.05,
      description: 'Symbol of status. Currently cosmetic.'
    },
    {
      id: 'skull',
      name: '💀 Skull Ring',
      value: 1000,
      rarity: 'Legendary',
      levelRequired: 20,
      chance: 0.01,
      description: 'Reduces robbery cooldown by 2 minutes.'
    },
    {
      id: 'disguise',
      name: '🎭 Disguise Kit',
      value: 300,
      rarity: 'Rare',
      levelRequired: 0,
      chance: 0.05,
      description: 'Use to hide from PvP crimes for 5 minutes.'
    },
    {
      id: 'lease',
      name: '🏠 Extended Lease',
      value: 500,
      rarity: 'Epic',
      levelRequired: 0,
      chance: 0.02,
      description: 'Extend your hideout protection by 10 minutes.'
    }
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
  
