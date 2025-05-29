// ✅ tools/updateBusinessNames.js
const mongoose = require('mongoose');
const Property = require('../economy/propertyModel');

// 🔗 MongoDB connection URI
const MONGO_URI = 'mongodb+srv://martmods:FsTuWhnJnPsaY4VX@tiktikwordgamecluster.ymb4b.mongodb.net/tiktokgame?retryWrites=true&w=majority&appName=TikTikWordGameCluster';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const names = [
  "📦 Corner Supply Co.",
  "🥡 Late Night Bodega",
  "🧯 Urban Auto Garage",
  "🍔 StackBurger Stand",
  "🧺 QuickWash Laundry",
  "🛠️ Rustbelt Repair Shop",
  "🧃 Juice & Boost Bar",
  "🪙 Pawn Power",
  "🚖 Hustle Cab Service",
  "🕹️ Retro Arcade Express",
  "🍗 Hot Wings Central",
  "🎒 Backpack Hustlers LLC",
  "🎮 Used Game Traders",
  "🧼 Squeaky Clean Detailing",
  "📀 Mixtape Distribution Co.",
  "🍦 Icebox Deluxe Parlor",
  "📱 Burner Phone Outlet",
  "🪩 LED Party Supply",
  "🧃 Trap Smoothie Lab",
  "🥇 Grime Gold Exchange",
  "🔐 VaultSide Lock & Key",
  "🛢️ Gas-N-Go Chain",
  "🐍 Serpent Sneaker Plug",
  "🧃 Hood Energy Drink Co.",
  "🏀 Street Legend Gym",
  "💈 Fade Up Barbershop",
  "🔌 Stream Scheme Studios",
  "🚨 Bail Bonds Unlimited",
  "🎯 Risky Bets Casino",
  "🔥 Heat Merchandising Inc.",
  "⛓️ Hustle & Flow Trucking",
  "🏗️ Foundation Flips LLC",
  "🧠 ThinkFast Ad Agency",
  "📦 GrimeLogix Logistics",
  "🐾 Exotic Pet Broker",
  "🍬 OffBrand Candy Labs",
  "🎤 Mic Check Studios",
  "🏬 TrapMall Retail Inc.",
  "🛰️ Dark Web Services",
  "💊 MetaMeds Pharma",
  "💼 Crypto Grit Exchange",
  "🎥 GrimeFlix Originals",
  "🌆 Hustle Housing Group",
  "📊 Flex Metrics Analytics",
  "🧳 Passport Hustlers Intl",
  "🧬 Clone Life Biotech",
  "🧿 Vision Vault Syndicate",
  "🚁 DreamAir Luxury Travel",
  "🧱 Pyramid Ventures Corp",
  "💽 DataFarm Underground",
  "👁️ The Network HQ",
  "⚖️ Underworld Finance Inc.",
  "🪙 GhostBank Holdings",
  "🧠 AI Syndicate Systems",
  "🏛️ Dreamworld Capital"
];

async function updateNames() {
  let updated = 0;

  for (let i = 0; i < names.length; i++) {
    const bizId = `biz_${i + 1}`;
    const name = names[i];

    const result = await Property.updateOne({ id: bizId }, { $set: { name } });
    if (result.modifiedCount > 0) {
      console.log(`✅ Updated ${bizId} → ${name}`);
      updated++;
    }
  }

  console.log(`\n🎉 Finished: ${updated} business names updated.`);
  mongoose.connection.close();
}

updateNames();
