// 📁 economy/fashionShop.js
const fetch = require('node-fetch');

let cachedDrop = [];

async function fetchFashionDrop() {
  console.log("🛰️ [FashionShop] Attempting to fetch fashion drop...");
  try {
    const response = await fetch('https://raw.githubusercontent.com/martymods/discord-community-bot/main/api/fashn.json');
    const data = await response.json();

    if (!data || !Array.isArray(data.items)) {
      throw new Error("Invalid or empty items array in fashion feed");
    }

    cachedDrop = data.items.map(item => ({
      id: `fashion_${item.slug}`,
      name: item.name,
      price: item.price_usd,
      brand: item.brand,
      image: item.image_url,
      tryOnUrl: item.try_on_url || null,
      statBuff: item.price_usd >= 1000 ? '+5 Respect' : item.price_usd >= 800 ? '+3 Agility' : '+1 Flex'
    }));

    console.log("✅ [FashionShop] Drop fetched:", cachedDrop.map(i => i.name));
  } catch (error) {
    console.error("⚠️ [FashionShop] Failed to fetch from fashion feed:", error.message);
    cachedDrop = [];
  }
}

function getFashionDrop() {
  if (!cachedDrop.length) {
    console.warn("⚠️ [FashionShop] Drop cache is empty.");
  }
  return cachedDrop;
}

module.exports = {
  fetchFashionDrop,
  getFashionDrop
};
