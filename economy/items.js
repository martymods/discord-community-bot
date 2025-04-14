const items = [
    { name: '💎 Gem', value: 100 },
    { name: '🎖️ Medal', value: 50 },
    { name: '🎲 Dice', value: 25 }
  ];
  
  module.exports = {
    items,
    getRandomItem() {
      const chance = Math.random();
      if (chance < 0.05) return items[0];
      if (chance < 0.1) return items[1];
      if (chance < 0.15) return items[2];
      return null;
    }
  };
  