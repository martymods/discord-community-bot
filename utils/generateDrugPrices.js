// utils/generateDrugPrices.js
function generateDrugPrices(drugs) {
    const updated = drugs.map(drug => {
      const min = drug.base - drug.volatility;
      const max = drug.base + drug.volatility;
      const price = Math.floor(Math.random() * (max - min + 1)) + min;
      return { ...drug, price };
    });
    return updated;
  }
  
  module.exports = { generateDrugPrices };
  