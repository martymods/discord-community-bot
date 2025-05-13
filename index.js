process.on('unhandledRejection', err => console.error('❌ Unhandled Rejection:', err));
process.on('uncaughtException', err => console.error('❌ Uncaught Exception:', err));
const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express'); // ✅ <-- ADD THIS LINE
const stealCooldowns = new Map(); // userId → timestamp
const wantedMap = new Map(); // userId -> { fails: Number, watched: Boolean }
const hideoutMap = new Map(); // userId → timestamp when hideout expires
const crimeStreaks = new Map(); // userId → { success: n, fail: n }
const heatMap = new Map(); // userId → { heat: 0–100, lastActivity: timestamp }
const pvpTasks = new Map(); // userId => { crimes: 0, lastReset: Date }
const survivalAchievements = new Set(); // userIds who survived theft with rare items
const playerAchievements = new Map(); // userId => Set of achievementIds
const pvpStats = new Map(); // userId => { bounties: 0, pvpWins: 0, hideouts: 0, survived: 0 }
const crimeBadges = new Map(); // userId => { badge: "Name", icon: "🔥", expires: timestamp }
const gangMap = new Map();
const turfZones = new Map(); // { zoneId: { owner: 'heist', lastRaid: timestamp } }
const turfRaidCooldowns = new Map(); // { userId: timestamp }
const turfFortifications = new Map(); // zone => fortification level (0–3)
const scavengeCooldowns = new Map(); // userId → timestamp
const winStreaks = new Map(); // userId → { streak: Number, lastWinTime: timestamp }
const fireBuffs = new Map(); // userId → { xpBoost: Number, expiresAt: timestamp }
const lootboxCooldowns = new Map(); // userId → timestamp
const itemComboTracker = new Map(); // userId → [last3Items]
const comboBuffs = new Map(); // userId → { expiresAt, bonuses }
const raidStrikes = new Map(); // userId => number of raids survived
const prisonUsers = new Map(); // userId => prisonReleaseTimestamp
const prisonBalances = new Map(); // userId => confiscated amount
const prisonQuests = new Map(); // userId → cooldown timestamp
const {
  getPlayerStats,
  addStatPoint,
  grantStatPoints,
  getStat,
  resetStats,
  playerStats,
  spendStatPoint,
  syncStatPointsWithLevel // ✅ This fixes the missing function
} = require('./statUtils');

const DealerProfile = require('./economy/dealerProfileModel');
const { recordSale, cancelPrivateWindow, shouldDM, spawnPrivateBuyer, activeBuyers, startNPCBuyers } = require('./events/npc/npcBuyers');
const buyerLoyalty = new Map(); // key = `${userId}_${npcName}`, value = count
const privateBuyTimers = new Map(); // key = `${userId}_${npcName}`, value = timeout
const handleStatButton = require('./components/statsButtons'); // ✅ better name for the handler
const buildStatButtons = require('./components/statsButtonBuilder'); // ✅ now you're importing the builder too
const { sendWinDrama } = require('./economy/dramaBetting');
const LotteryWinner = require('./economy/lotteryWinners');
const { getHP } = require('./economy/deathSystem');
const Levels = require('./economy/xpRewards');
const { runCrime, resolveCrimeOutcome } = require('./systems/crimeMissions');
const { activeCrimeData } = require('./systems/globalCrimeState');
const gambleCommand = require('./commands/gambleCommand');
const xpPerTier = { 10: 2, 100: 10, 1000: 25, 10000: 75, 100000: 250 };
const cooldowns = new Map(); // for gamble interaction
const { handleRematch } = require('./commands/gambleCommand.js');
const streaks = new Map();
const blackjackTables = new Map();
const Property = require('./economy/propertyModel');
const { Currency } = require('./economy/currency'); // ✅ correct
const { hasItem } = require('./economy/inventory');
const { spawnFenceDealer } = require('./events/npc/spawnFenceDealer');
const { spawnMule, deliveryLoyalty } = require('./events/npc/npcMules');
const dogMap = new Map(); // userId => { breed, hp, cooldown }
const { tryDogDefense, getDogStats, updateDogAfterDefense, getDogImage } = require('./events/npc/defense/dogSystem');
const namedog = require('./commands/namedog');
const mydog = require('./commands/mydog');
const feeddog = require('./commands/feeddog');
const DogProfile = require('./models/Dog'); 
const robberMoods = ["confident", "neutral", "scared"];
const { items } = require('./economy/items');
const strayDogs = new Map(); // Tracks active stray dogs
const activeBulkBuyers = new Map();
const { maybeTriggerRobbery } = require('./events/npc/npcRobbery');
const JobProfile = require('./models/JobProfile');
const JobLeaderboard = require('./models/jobLeaderboardModel');
const Plant = require('./models/PlantModel');
const { fetchFashionDrop } = require('./economy/fashionShop');
const fashion = require('./commands/fashn'); // or rename to fashion.js
const wardrobe = require('./commands/wardrobe');
const fashionboard = require('./commands/fashionboard');
const gangViewer = require('./commands/gangs'); // or './economy/gangs' if moved there
const { adjustMood } = require('./events/npc/mood'); // Adjust path if needed
const buyCommand = require('./commands/buyCommand');
const myOrdersCommand = require('./commands/myOrdersCommand');
const { sendToSportsIntel } = require('./functions/helpers/logging');
const crystalAI = require('./events/crystalAI');
const { generateCrystalMessage } = require('./events/crystalAI');
const playCommand = require('./commands/play.js');
const { generateCarmenMessage } = require('./events/npc/carmenAI');
const { fetchStockPrice, isPennyStock } = require('./utils/fetchStockPrice');


global.bountyMap = global.bountyMap || new Map();
global.dogshop = global.dogshop || new Map(); // ✅ Add this here

let rotatingShop = [];
let nextRotationTimestamp = Date.now() + 20 * 60 * 1000; // 20 minutes from now
let lastShopMessage = null;


const coreTips = [
  "💎 Stack your daily streak. Missing one day resets your momentum.",
  "🛡️ Use hideouts to time your upgrades. Stack safely, strike smart.",
  "📈 XP gains scale fast above Level 10 — don’t burn out early.",
  "🎒 The stash cap is your leash. Upgrade it or fall behind.",
  "🎭 Gangs change everything. Whisper or Heist bonuses can define your grind.",
  "💰 Don’t waste items. Selling low-tier gear early always haunts you later.",
  "🔥 Grit and Intellect are underrated stats. Pros know why.",
  "🎯 High-risk real players earns more than gambling — if you can handle the heat.",
  "🏚️ Every hour in hideout can change your day. It’s not just for safety.",
  "📊 Check !leaderboard daily. If you’re not climbing, you’re falling.",
  "🧠 Prison isn’t a setback. It’s free XP — if you know how to use it.",
  "🎲 Losing a gamble? Good. That’s the system testing your loyalty.",
  "🏆 The top 1% click when everyone else hesitates.",
  "🔄 Resetting can be stronger than continuing. Walk away smarter.",
  "💥 There’s no ceiling — just players who gave up first.",
  "💣 Gangs that coordinate raids win turf. Gangs that don’t get farmed.",
  "🎭 Someone in your gang is stashing for a solo run. Are you watching them?",
  "👥 Bonus effects from Whisper and Heist stack. Use your members wisely.",
  "🧩 The more your gang fortifies, the less they attack. Watch behavior.",

  // 🧨 New social paranoia tips
  "🕵️ Someone is lurking right now. Every minute you sit idle is a minute they’re stalking your wallet.",
  "🔓 Haven’t checked your inventory in a while? Someone else might be counting your items already.",
  "💣 Gangs that coordinate raids win turf. Gangs that don’t get farmed.",
  "👁️ You’re being watched. The richest players always are.",
  "💬 Players who share tips are stalling you. Their real advice is whispered in DMs.",
  "⚔️ Never trust a gang member who tells you to save your skulls.",
  "🧃 If you’re not defending, you’re leaking value. The top players steal daily.",
  "👊 Player vs player isn’t about fair fights. It’s about robbing someone you just laughed with.",
  "⛓️ Low XP? You’re prey. Build stats or build friends — fast.",
  "🎭 Someone in your gang is secretly stashing for a solo run. Are you watching them?",
  "📦 Losing a duel isn’t the worst. It’s what they take after that hurts.",
  "🪞 The moment you think you're safe is the moment someone sees your name in their lurk log.",
  "👻 Ghost players wait for streaks to drop. Then they move in.",
  "💀 Stat builds aren’t just numbers. They’re weapons. Yours is being analyzed right now.",
  "🏚️ Hideouts aren’t just for defense. They’re a message: 'I know you’re hunting me.'"

  
];

const gangTips = [
  "💣 Gangs that coordinate raids win turf. Gangs that don’t get farmed.",
  "🎭 Someone in your gang is stashing for a solo run. Are you watching them?",
  "👥 Bonus effects from Whisper and Heist stack. Use your members wisely.",
  "🧩 The more your gang fortifies, the less they attack. Watch behavior."
];

const bountyTips = [
  "👀 Players with bounties are magnets. Steal from them — or help them fall.",
  "🔍 Type !wanted @user before you rob someone. Know your prey.",
  "⚠️ Having a bounty makes you a legend. Or a target. Sometimes both."
];

const prisonTips = [
  "⛓️ Every minute in prison is time someone else is rising.",
  "🧪 Use !smuggle or !rat — prison isn’t the end, it’s a shift in gameplay.",
  "🏋️‍♂️ Grit lowers prison time. So does strategy. Stack it."
];

function getContextualTip(userId) {
  const isInGang = gangMap.has(userId);
  const bounty = bountyMap?.get(userId) || 0;
  const prisonTime = prisonUsers?.get(userId);
  const inPrison = prisonTime && prisonTime > Date.now();

  const available = [...coreTips];
  if (isInGang) available.push(...gangTips);
  if (bounty > 0) available.push(...bountyTips);
  if (inPrison) available.push(...prisonTips);

  return available[Math.floor(Math.random() * available.length)];
}

function sendLoginTip(channel, userId) {
  const tip = getContextualTip(userId);
  channel.send(`👁️ <@${userId}>, a word of advice...

${tip}`);
}


const npcNames = [
  'SlimyLenny', 'Momo', 'ShadyRico', 'JailhouseKev', 'TinyTony',
  'SneakyDee', 'GhostRay', 'TrapBobby', 'ElGato', 'NailsMarv',
  'BackdoorDon', 'LilDrip', 'TwitchySteve', 'StacksMiguel', 'BoomerangJoe',
  'WraithNiko', 'VelvetVic', 'SouthsideAli', 'FakeJerry', 'SwitchbladeCruz',
  'QuickKash', 'SlyJuan', 'NoEyesNate', '3rdShiftShawn', 'YungCrumbs',
  'CreditCarl', 'DiceyDan', 'TokyoSlim', 'ZazaKai', 'MetroLuther',
  'BasementTrey', 'MuffinFace', 'BlackMarketBev', 'JuJuFlex', 'PlugsyRick',
  'LowBatteryLou', 'WhisperKev', 'OffGridManny', 'ChapoTwin', 'FishscaleFinn',
  'SleepyOx', 'RogueAmir', 'StickyNick', 'EchoDre', 'HazmatLeo',
  'FugaziFred', 'DustyDrew', 'WiretapWes', 'HoodieDaz', 'CrumbsClay'
];

// Initial Turf Setup
turfZones.set("Downtown", { owner: "heist", lastRaid: 0 });
turfZones.set("Back Alley", { owner: "bribe", lastRaid: 0 });
turfZones.set("Warehouse", { owner: "bounty", lastRaid: 0 });


require('dotenv').config();

const fs = require('fs');



// Helper: Convert XP to Level
function getLevelFromXP(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}


function updateWinStreak(userId, didWin) {
  const streak = winStreaks.get(userId) || { streak: 0, lastWinTime: 0 };
  const now = Date.now();

  if (didWin) {
    const newStreak = now - streak.lastWinTime > 10 * 60 * 1000 ? 1 : streak.streak + 1;
    winStreaks.set(userId, { streak: newStreak, lastWinTime: now });

    // 🔥 Trigger buff at 3 or more
    if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
      fireBuffs.set(userId, {
        xpBoost: newStreak >= 10 ? 2 : newStreak >= 5 ? 1.75 : 1.5,
        expiresAt: now + 10 * 60 * 1000 // lasts 10 mins
      });
    }

    return newStreak;
  } else {
    winStreaks.set(userId, { streak: 0, lastWinTime: 0 });
    fireBuffs.delete(userId); // lose buff
    return 0;
  }
}

async function setDog(userId, guildId, data) {
  let dog = await DogProfile.findOne({ userId, guildId });
  if (!dog) {
    dog = new DogProfile({ userId, guildId });
  }

  if (data.name) dog.name = data.name;
  if (data.breed) dog.breed = data.breed;
  if (data.hp != null) dog.hp = data.hp;
  if (data.mood) dog.mood = data.mood;
  if (data.level != null) dog.level = data.level;
  if (data.cooldown != null) dog.cooldown = data.cooldown;

  // Extra: if your dog has stats, save them too
  if (data.stats) {
    dog.stats = {
      def: data.stats.def || 5,
      pow: data.stats.pow || 0,
      dex: data.stats.dex || 0,
      mind: data.stats.mind || 0,
      iq: data.stats.iq || 0,
      sync: data.stats.sync || 100
    };
  }

  await dog.save();
}


function unlockAchievement(userId, name, icon, message, channel) {
  const userAchieves = playerAchievements.get(userId) || new Set();
  if (userAchieves.has(name)) return;

  userAchieves.add(name);
  playerAchievements.set(userId, userAchieves);

  const embed = new EmbedBuilder()
    .setTitle(`${icon} Real Achievement Unlocked!`)
    .setDescription(`**${name}**\n${message}`)
    .setColor('#ffd700')
    .setFooter({ text: 'Real Achievements System' })
    .setTimestamp();

  channel.send({ content: `<@${userId}>`, embeds: [embed] });
}

function setCrimeBadge(userId, name, icon, durationMs = 3 * 24 * 60 * 60 * 1000) {
  crimeBadges.set(userId, {
    badge: name,
    icon,
    expires: Date.now() + durationMs,
  });
}

function getGangEmoji(gangId) {
  const gangEmojis = {
    heist: "🎭",
    bribe: "💵",
    bounty: "💣",
    challenge: "🏆"
  };
  return gangEmojis[gangId] || "❓";
}

function generateMarketEmbed(user, profile, balance) {
  const rawPrices = profile.prices instanceof Map
    ? profile.prices
    : new Map(Object.entries(profile.prices));

  const inv = profile.inventory instanceof Map
    ? Object.fromEntries(profile.inventory)
    : profile.inventory;

  let desc = `💰 **$${balance}** DreamworldPoints\n📦 Stash: **${profile.stashUsed}/${profile.stashCap}**`;
  if (profile.stashUsed >= profile.stashCap) desc += ` 🔴 (FULL)`;
  if (balance <= 100) desc += ` ⚠️ (Low Funds)`;

  const embed = new EmbedBuilder()
    .setTitle(`💊 Street Market — ${user.username}`)
    .setDescription(desc)
    .setColor('#ff55ff')
    .setFooter({ text: 'Prices update every 1 minute automatically' })
    .setTimestamp();

  for (const d of drugs) {
    const price = rawPrices.get(d.id);
    const qty = inv[d.id] || 0;
    const priceDisplay = typeof price === 'number' ? `$${price}` : `❓`;

    embed.addFields({
      name: `${d.emoji || ''} ${d.name} — ${priceDisplay}`,
      value: `You own: **${qty}**`,
      inline: true
    });
  }

  return embed;
}

function rotateShop() {
  rotatingShop = [];

  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const selectedItems = shuffled.slice(0, 8);

  for (const item of selectedItems) {
    rotatingShop.push({
      ...item, // ✅ full item spread
      stock: Math.floor(Math.random() * 8) + 3
    });
  }

  nextRotationTimestamp = Date.now() + 20 * 60 * 1000;
}

function getSeedYield(seedId) {
  const n = parseInt(seedId.replace('weed_seed_', ''));
  return Math.min(1 + Math.floor(n / 2), 8);
}

function getGrowthTime(potId) {
  const pot = potId.replace('weed_pot_', '');
  return (10 - parseInt(pot) * 2) * 60 * 1000; // e.g., 10, 8, 6 min
}

function getPotNumber(potId) {
  return potId.replace('weed_pot_', '');
}

// 🟦 Progress bar generator
function getProgressBar(elapsed, duration) {
  const percent = Math.min(100, Math.floor((elapsed / duration) * 100));
  const blocks = Math.floor(percent / 10);
  return '🟦'.repeat(blocks) + '⬛'.repeat(10 - blocks) + ` ${percent}%`;
}

// 🪴 Growth image resolver
function getPlantImage(potType, stage) {
  return `https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/farming/weed_r_p${potType}_${stage}.png`;
}

// ⌛ Stage calculation
function getStage(elapsed, duration) {
  if (!duration || isNaN(duration) || duration <= 0) return 0;
  const ratio = elapsed / duration;
  return Math.max(0, Math.min(5, Math.floor(ratio * 6)));
}

function getHeatRank(value) {
  if (value < 10) return '🧊 Cool';
  if (value < 25) return '🌶️ Warm';
  if (value < 50) return '🔥 Hot';
  return '🚨 WANTED';
}


// after this line 👇
const app = require('./keep_alive');

// now it's safe to add this 👇
app.use('/sharedphotos', express.static('public/sharedphotos'));

// Webhooks & Keep Alive

const stripeWebhook = require('./payments/stripe');
const paypalWebhook = require('./payments/paypal');

const FINANCE_CHANNEL_ID = '1362077468076539904';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection(); // ✅ ADD THIS LINE



global.client = client; // So Stripe/Paypal access your client

// ✅ Ensure globals are initialized
global.lootboxCooldowns = global.lootboxCooldowns || new Map();
global.lootboxProfiles = global.lootboxProfiles || new Map();
global.comboBuffs = global.comboBuffs || new Map();

const { getBalance, addCash, removeCash } = require('./economy/currency');
const games = require('./economy/games');
const { getRandomItem } = require('./economy/items');
const { addItem, removeItem, getInventory, Inventory, saveInventory } = require('./economy/inventory');
const cron = require('node-cron');
const Ticket = require('./economy/ticket');
const Pool = require('./economy/pool');
const { triggerDrama } = require('./economy/drama');
const { getTopWinners } = require('./economy/bettingStats');
const { getUserHistory } = require('./economy/bettingHistory');
const { getTodayGames } = require('./economy/nbaGames');
const { createChallenge, acceptChallenge } = require('./economy/p2pBets');
const { recentGames } = require('./economy/nbaGames');
const { placeBet } = require('./economy/betting');
const { resolveFinishedGames } = require('./economy/autoResolve');
const { getJackpotAmount, getLastWinner } = require('./economy/jackpot');
const { hasPaidForSubmission } = require('./economy/musicPayCheck.js');
const { buildRealTeamStats, simpleLogicPredict, runDailyPredictions } = require('./economy/sportsPredict');
const { scanTicker } = require('./economy/financeIntel');
const { scanOptionsFlow } = require('./economy/flowIntel');
const { addTrackedTicker, getAllSnipers, getTrackedTickers } = require('./economy/sniperTargets');
const { scanAllSnipers } = require('./economy/flowIntel');
const { getSniperRotation } = require('./economy/sniperTargets');
const realShopItems = require('./economy/realShopItems');
const TokenModel = require('./economy/bettingStatsModel');
const { startRandomChaos } = require('./economy/chaosEvents');
const { getNextTier, shouldUpgradeBox, tierThreshold } = require('./utils/boxUtils');



let todaySnipes = [];

// Drug definitions
const drugs = [
  { id: 'weed', name: '🌿 Weed', base: 150, volatility: 50 },
  { id: 'meth', name: '💎 Meth', base: 1300, volatility: 600 },
  { id: 'acid', name: '🌀 Acid', base: 800, volatility: 300 },
  { id: 'heroin', name: '🩸 Heroin', base: 1800, volatility: 700 },
  { id: 'shrooms', name: '🍄 Shrooms', base: 400, volatility: 150 }
];
// Removed duplicate npcMood import to avoid redeclaration


const {
  adjustReputation,
  getReputation,
  getReputationRank,
  getMood,
  getMoodEffect,
  isBlocked
} = require('./events/npc/npcReputation');


const welcomeMessages = [
  "👋 Welcome to the party, <@USER>!",
  "💎 Fresh player... <@USER> has entered the arena.",
  "😎 Oh crap, <@USER> just pulled up.",
  "🔥 Bless the chat, <@USER> just arrived.",
  "📦 <@USER> unpacked their inventory and joined us.",
  "👀 Another challenger appears: <@USER>",
  "💰 Someone tell <@USER> the rent is due every day in here.",
  "😤 Hope you're ready for good ideas, <@USER>.",
  "⚡ New player joined: <@USER>. Stats loading...",
  "🎭 <@USER> just walked in like we weren't talking about them.",
  "🎟️ Admit one chaos ticket: <@USER>",
  "🍀 Lucky <@USER> showed up... or unlucky?",
  "💬 What's up, <@USER>? Don't trust anyone btw.",
  "🕶️ <@USER> entered the simulation.",
  "🔮 Someone check <@USER>'s energy. Feels high rank.",
  "🎲 Roll the dice... <@USER> is live.",
  "📡 Signal detected: <@USER> connected.",
  "💼 New investor in the market: <@USER>",
  "🏆 Watch out — <@USER> looks like trouble."
];




const dealerCommand = require('./commands/dealer');
client.commands.set('dealer', dealerCommand);


client.commands.set('buy', buyCommand);
client.commands.set('myorders', myOrdersCommand);

client.commands.set('ping', {
  execute(message) {
    const replies = [
      "🏓 Pong! You happy now?",
      "Yo, stop pinging me like I owe you money.",
      "Pong? More like... you're broke.",
      "Ping pong champ reporting in.",
      "⚡ Fast like rent's due."
    ];
    message.channel.send(replies[Math.floor(Math.random() * replies.length)]);
  }
});

client.commands.set('lootbox', {
  async execute(message) {
    try {
      const userId = message.author.id;
      const guildId = message.guild.id;
      const now = Date.now();
      const lastUsed = lootboxCooldowns.get(userId) || 0;

      if (now - lastUsed < 30 * 60 * 1000) {
        const mins = Math.ceil((30 * 60 * 1000 - (now - lastUsed)) / 60000);
        return message.reply(`⏳ You can open another lootbox in ${mins} minute(s).`);
      }

      // 📦 Load or initialize lootbox profile
      const profile = lootboxProfiles.get(userId) || { boxTier: 'common', boxXP: 0 };
      const tier = profile.boxTier;

      // 🔁 Load loot item
      let item = getRandomItem?.(); // defensive call
      if (!item) {
        return message.reply("💨 You opened a lootbox... but it was empty.");
      }

      // 🎯 Buff logic for rare item boost
      const buff = comboBuffs.get(userId);
      if (buff && buff.expiresAt > now && buff.bonuses?.rareDropBoost) {
        if (Math.random() < 0.25) {
          const rareItems = items.filter(i =>
            ['Rare', 'Epic', 'Legendary'].includes(i.rarity)
          );
          item = rareItems[Math.floor(Math.random() * rareItems.length)];
        }
      }

      // 📥 Give item + mark cooldown
      await addItem(userId, guildId, item.id);
      lootboxCooldowns.set(userId, now);

      // 🎁 Gain lootbox XP
      profile.boxXP += 1;
      lootboxProfiles.set(userId, profile);

      // 🧠 Handle lootbox tier upgrades
      if (shouldUpgradeBox(tier, profile.boxXP)) {
        const nextTier = getNextTier(tier);
        if (nextTier) {
          profile.boxTier = nextTier;
          profile.boxXP = 0;

          const upgradeEmbed = new EmbedBuilder()
            .setTitle(`🆙 Lootbox Tier Upgraded!`)
            .setDescription(`You've unlocked the **${nextTier.toUpperCase()} Tier**!`)
            .setColor('#ffaa00')
            .setThumbnail('https://i.imgur.com/X3fXTJ1.png')
            .setFooter({ text: 'Higher tiers = better rewards' });

          message.channel.send({ content: `<@${userId}>`, embeds: [upgradeEmbed] });
        }
      }

      // 💥 Legendary reward global alert
      if (item.rarity === 'Legendary') {
        const channel = message.guild.systemChannel || message.channel;
        channel.send(`💥 LEGENDARY DROP 💥\n<@${userId}> just pulled a **${item.name}** from a Lootbox!`);
      }

      // 🎨 Visual Box Embed
      const colors = {
        common: '#999999',
        uncommon: '#33cc33',
        rare: '#3399ff',
        epic: '#cc33ff',
        legendary: '#ffaa00'
      };

      const art = {
        common: 'https://i.imgur.com/dyGSvvu.png',
        uncommon: 'https://i.imgur.com/7Q8G3GI.png',
        rare: 'https://i.imgur.com/xXtfZBa.png',
        epic: 'https://i.imgur.com/29AtU8Q.png',
        legendary: 'https://i.imgur.com/e8Ue0kM.png'
      };

      const embed = new EmbedBuilder()
        .setTitle(`🎁 ${tier.charAt(0).toUpperCase() + tier.slice(1)} Lootbox Opened!`)
        .setDescription(`You found **${item.name}** \`${item.rarity}\``)
        .setColor(colors[tier] || '#55ff88')
        .setThumbnail(art[tier] || '')
        .setFooter({ text: `Progress: ${profile.boxXP}/${tierThreshold[profile.boxTier] || 10} XP` });

      message.channel.send({ embeds: [embed] });

    } catch (err) {
      console.error("❌ Lootbox Error:", err);
      return message.reply("❌ Something went wrong opening your lootbox.");
    }
  }
});

const dropCommand = require('./commands/dropmoney'); // ✅ define it first
client.commands.set('dropmoney', dropCommand);       // ✅ then register it

client.commands.set('balance', {
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    const bal = await getBalance(userId, guildId);
    const profile = await DealerProfile.findOne({ userId, guildId });
    const stashUsed = profile?.stashUsed || 0;
    const stashCap = profile?.stashCap || 20;

    const levelData = await Levels.fetch(userId, guildId);
    const userLevel = levelData?.level || 1;
    const userXP = levelData?.xp || 0;
    const nextLevelXP = (userLevel + 1) * 300;
    const xpProgress = Math.min(Math.floor((userXP / nextLevelXP) * 10), 10);
    const xpBar = '🟩'.repeat(xpProgress) + '⬛'.repeat(10 - xpProgress);

    const heatData = heatMap.get(userId) || { heat: 0 };
    const heatRank = getHeatRank(heatData.heat);

    const embed = new EmbedBuilder()
      .setTitle("🏦 Your Street Status")
      .setDescription(`Here’s your updated game info:`)
      .addFields(
        {
          name: "💰 DreamworldPoints",
          value: `> **__🟢 $${bal.toLocaleString()}__**`, // 👈 Big, bold, underlined
          inline: false
        },
        {
          name: "📦 Stash Used",
          value: `${stashUsed}/${stashCap}`,
          inline: true
        },
        {
          name: "🔥 Heat",
          value: `${heatRank}`,
          inline: true
        },
        {
          name: "🧠 Level Progress",
          value: `Lvl ${userLevel} → ${userXP}/${nextLevelXP} XP\n${xpBar}`,
          inline: false
        }
      )
      .setColor('#00ff88')
      .setFooter({ text: "🏚️ Grow your empire. Stay sharp." })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
});


client.commands.set('daily', {
  async execute(message) {
    const userId = message.author.id;
    const user = await Currency.findOne({ userId, guildId: message.guild.id }) || new Currency({ userId, guildId: message.guild.id });
    const now = new Date();
    const last = user.lastDaily || new Date(0);
    const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));

    if (diff < 1) return message.reply("🕒 You already claimed your daily reward. Come back tomorrow!");

    // 📈 Streak tracking
    if (!user.streak) user.streak = 1;
    else if (diff === 1) user.streak += 1;
    else user.streak = 1;

    // 💰 Streak-based reward
    let reward = 250 * user.streak;

    // 🔥 Bonus for every 7th day
    let bonusLine = "";
    if (user.streak % 7 === 0) {
      reward += 500;
      bonusLine = "\n🔥 **7-Day Streak Bonus: +$500**";
    }

    user.cash += reward;
    user.lastDaily = now;
    await user.save();

    // 👁️ Whisper-style tip
    sendLoginTip(message.channel, userId);

    // 🌈 Visual Embed
    const bar = "🟩".repeat(user.streak % 10) + "⬜".repeat(10 - (user.streak % 10));
    const embed = new EmbedBuilder()
      .setTitle("📅 Daily Reward Claimed!")
      .setDescription(`You’ve logged in **${user.streak} day(s)** in a row!`)
      .addFields(
        { name: "💸 Streak Reward", value: `$${250} x ${user.streak} = $${250 * user.streak}`, inline: true },
        { name: "🎁 Total Today", value: `$${reward}`, inline: true },
        { name: "📊 Progress", value: `${bar} (${user.streak % 10}/10)`, inline: false }
      )
      .setColor(user.streak >= 10 ? "#00ffaa" : "#ffaa00")
      .setFooter({ text: "Claim again tomorrow to keep your streak alive!" })
      .setThumbnail(message.author.displayAvatarURL())
      .setTimestamp();

    await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });

    if (bonusLine) {
      await message.channel.send(bonusLine);
    }
  }
});

client.commands.set('flip', {
  async execute(message, args) {
    const choice = args[0]?.toLowerCase();
    const amount = parseInt(args[1]);

    if (!['heads', 'tails'].includes(choice)) return message.reply("Usage: `!flip heads|tails amount`");
    if (isNaN(amount) || amount <= 0) return message.reply("Bet a valid amount.");

    const balance = await getBalance(message.author.id, message.guild.id);
    if (balance < amount) return message.reply("You're too broke for that bet.");

    await removeCash(message.author.id, message.guild.id, amount);

    const embed = new EmbedBuilder()
      .setTitle("🪙 Flipping the Coin...")
      .setDescription("Spinning...")
      .setColor("#cccccc")
      .setFooter({ text: "Good luck..." });

    const msg = await message.channel.send({ embeds: [embed] });

    const frames = ["🪙", "🔄", "🪙", "🔁", "🪙", "🔄", "🪙"];
    for (const frame of frames) {
      await new Promise(r => setTimeout(r, 500));
      embed.setDescription(frame);
      await msg.edit({ embeds: [embed] });
    }

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;

    const xp = won ? 15 : 5;
    const winnings = won ? amount * 2 : 0;

    let bonusXp = xp;
    const fire = fireBuffs.get(message.author.id);
    if (fire && fire.expiresAt > Date.now()) {
      bonusXp = Math.floor(xp * fire.xpBoost);
    }

    if (won) await addCash(message.author.id, message.guild.id, winnings);
    await Levels.appendXp(message.author.id, message.guild.id, bonusXp);

    const streak = updateWinStreak(message.author.id, won);
    if (streak >= 3 && won) {
      embed.addFields({ name: "🔥 Hot Streak!", value: `You're on a ${streak}-win streak! Keep it going! 🥵`, inline: false });
    }

    embed.setTitle(won ? "🎉 You Won the Coin Flip!" : "😢 You Lost the Flip")
      .setDescription(`The coin landed on **${result.toUpperCase()}**`)
      .setColor(won ? "#00ff88" : "#ff5555")
      .setFooter({ text: `${won ? `+ $${winnings}` : `- $${amount}`} | +${bonusXp} XP` });

    await msg.edit({ embeds: [embed] });
  }
});

client.commands.set('slots', {
  async execute(message) {
    const userId = message.author.id;
    const bet = 100;

    const balance = await getBalance(userId, message.guild.id);
    if (balance < bet) return message.reply("🪙 You need at least $100 to play the slots.");

    await removeCash(userId, message.guild.id, bet);

    const symbols = ["🍒", "🍋", "💎", "🔔", "7️⃣"];
    const roll = () => [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    const embed = new EmbedBuilder()
      .setTitle("🎰 Spinning the Slots...")
      .setDescription("🎲 🎲 🎲")
      .setColor("#cccccc")
      .setFooter({ text: "Rolling..." });

    const msg = await message.channel.send({ embeds: [embed] });

    const spin1 = roll();
    const spin2 = roll();
    const spin3 = roll();

    await new Promise(r => setTimeout(r, 700));
    embed.setDescription(`${spin1[0]} ❔ ❔`);
    await msg.edit({ embeds: [embed] });

    await new Promise(r => setTimeout(r, 700));
    embed.setDescription(`${spin1[0]} ${spin2[1]} ❔`);
    await msg.edit({ embeds: [embed] });

    await new Promise(r => setTimeout(r, 700));
    const final = spin3;
    embed.setDescription(`${final[0]} ${final[1]} ${final[2]}`);

    const win = final[0] === final[1] && final[1] === final[2];
    const xp = win ? 30 : 10;
    const reward = win ? bet * 5 : 0;

    let bonusXp = xp;
    const fire = fireBuffs.get(userId) || comboBuffs.get(userId);

    if (fire && fire.expiresAt > Date.now()) {
      bonusXp = Math.floor(xp * fire.xpBoost);
    }

    const streak = updateWinStreak(userId, win);
    if (streak >= 3 && win) {
      embed.addFields({ name: "🔥 On Fire!", value: `You're on a ${streak}-win streak! 🔥 Bonus luck is coming...`, inline: false });
    }

    if (win) {
      await addCash(userId, message.guild.id, reward);
      await Levels.appendXp(userId, message.guild.id, bonusXp);
      embed.setTitle("🎉 JACKPOT WINNER!");
      embed.setColor("#00ff88");
      embed.setFooter({ text: `+ $${reward} | +${bonusXp} XP` });
    } else {
      await Levels.appendXp(userId, message.guild.id, bonusXp);
      embed.setTitle("😢 Better Luck Next Time");
      embed.setColor("#ff4444");
      embed.setFooter({ text: `-${bet} | +${bonusXp} XP` });
    }

    await msg.edit({ embeds: [embed] });
  }
});

client.commands.set('roast', {
  execute(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply("Who you tryna roast? Mention someone.");
    
    const burns = [
      "Built like a rejected Discord update.",
      "When they said 'Touch grass' — they meant it.",
      "Battery low... just like your IQ.",
      "If boring was a personality type, you'd be platinum.",
      "Your vibe? 404 not found."
    ];

    message.channel.send(`${target}, ${burns[Math.floor(Math.random() * burns.length)]}`);
  }
});

client.commands.set('help', {
  async execute(message) {
    const pages = [
      new EmbedBuilder()
        .setTitle('🎮 Core Gameplay')
        .setDescription(`
!ping — Test the Slave is alive  
!balance — Check your DreamworldPoints  
!daily — Claim daily rewards (streaks)  
!inventory — View your item stash  
!use <item> [amount] — Use gem, dice, skull, etc.  
> Example: \`!use gem 5\`  
!shop — View today's shop  
!buyitem <item> — Buy from shop  
> Example: \`!buyitem dice\`  
!gambleitem <item> — 40% chance to double  
!lurk — Gain slow XP (drama may trigger)  
!scavenge — Search for XP or items  
!stats — View and assign stat points  
!heal — Restore health (if you have items)
        `)
        .setColor('#00ffaa'),

      new EmbedBuilder()
        .setTitle('💰 Gambling Games')
        .setDescription(`
!gamble — Play several games  
!flip heads|tails <amount>  
> Example: \`!flip heads 50\`  
!slots <amount> — Fully animated slots  
> Example: \`!slots 100\`
        `)
        .setColor('#ffaa00'),

      new EmbedBuilder()
        .setTitle('🎟️ Lottery System')
        .setDescription(`
!buyticket <amount> <number(optional)>  
!drawlottery — Pick a winner  
!mytickets — View your tickets  
!lasttickets — Recent buyers  
!lotteryinfo — Pool status
        `)
        .setColor('#ff00aa'),

        new EmbedBuilder()
        .setTitle('🧥 Fashion System')
        .setDescription(`
      Dress like a boss and earn buffs. Spend DreamworldPoints on real fashion drops from SSENSE and flex your wardrobe.
      
      📦 **Commands**  
      \`!fashion\` — View today’s high-fashion drop  
      \`!wardrobe\` — View your collected pieces  
      \`!fashionboard\` — Top 10 fashion spenders  
      
      🛍️ **How It Works**  
      - Items rotate daily from real fashion listings  
      - Each piece shows:  
        • Brand  
        • Price  
        • Stat Buff (+Respect, +Agility, etc.)  
        • Image + Try-On Link  
      
      💎 **Wardrobe Buffs**  
      - Fashion buffs scale with price  
      - Collected items apply passive buffs (like RPG gear)  
      - Buffs include +Respect, +Agility, +Luck...
      
      🏆 **Leaderboard**  
      \`!fashionboard\` tracks total wardrobe value  
      Also shows your most expensive piece + buffs  
      
      💡 **Tips**  
      - Items never expire  
      - Every purchase builds your Fashion Power  
      - Rarest items = most Respect
      `)
        .setFooter({ text: 'Fashion is power. Look rich, play smarter.' })
        .setColor('#ff55aa'),
      

      new EmbedBuilder()
        .setTitle('📊 XP & Leaderboards')
        .setDescription(`
!rank — Your XP and level  
!leaderboard — Top XP players  
!topxp — Highest XP holders  
!richest — Top DreamworldPoint holders  
!topcollectors — Inventory hoarders  
!achievements — View unlocked achievements  
!prisonrecord — Track your rat and riot history  
        `)
        .setColor('#aa00ff'),

        new EmbedBuilder()
        .setTitle('⚔️ Battle & Crime System')
        .setDescription(`
      \`!steal @user\` — Attempt a robbery  
      \`!crime\` — Solo heist (scales by level)  
      \`!bounty @user\` — Place a bounty  
      \`!hideout\` — Enter a safehouse  
      \`!wanted @user\` — Check status  
      \`!challenge @user <amount>\` — Duel another player  
      \`!accept <userId>\` — Accept a duel  
      
      🎒 **Notable Items**  
      \`!use disguise\` — Clear wanted level  
      \`!use lease\` — Extend hideout  
      \`!use skull\` — Reduce cooldowns
      `)
        .setColor('#ff0055'),
      
        new EmbedBuilder()
        .setTitle('🧥 Fashion System')
        .setDescription(`
      Dress like a boss and earn buffs. Spend DreamworldPoints on real fashion drops from SSENSE and flex your wardrobe.
      
      📦 **Commands**  
      \`!fashion\` — View today’s high-fashion drop  
      \`!wardrobe\` — View your collected pieces  
      \`!fashionboard\` — Top 10 fashion spenders  
      
      🛍️ **How It Works**  
      - Items rotate daily from real fashion listings  
      - Each piece shows:  
        • Brand  
        • Price  
        • Stat Buff (+Respect, +Agility, etc.)  
        • Image + Try-On Link  
      
      💎 **Wardrobe Buffs**  
      - Fashion buffs scale with price  
      - Collected items apply passive buffs (like RPG gear)  
      - Buffs include +Respect, +Agility, +Luck...
      
      🏆 **Leaderboard**  
      \`!fashionboard\` tracks total wardrobe value  
      Also shows your most expensive piece + buffs  
      
      💡 **Tips**  
      - Items never expire  
      - Every purchase builds your Fashion Power  
      - Rarest items = most Respect
      `)
        .setFooter({ text: 'Fashion is power. Look rich, play smarter.' })
        .setColor('#ff55aa'),
      
        new EmbedBuilder()
        .setTitle('🐶 Guard Dog System')
        .setDescription(`Train your loyal dog to protect you aginst real players and unlock bonus powers!
      
      📦 **Commands**  
\`!buydog\` — Adopt a defensive companion  
\`!mydog\` — View your dog's stats & mood  
\`!namedog <name>\` — Give your dog a name  
\`!feeddog <item>\` — Boost stats with treats  

> Example: \`!feeddog treat_def\`

🧪 **Stats**  
• 🛡️ DEF – Reduces chance of being robbed  
• 💪 POW – Weakens enemy steal attempts  
• 🎯 DEX – Chance to block steal before it's clicked  
• 🧠 MIND – Psychic warning when being scouted  
• 🧬 IQ – Chance to trap attacker and reverse steal  
• ⚡ SYNC – Bonus XP from real player battles defenses

🍖 **Feeding Cooldown**  
You can feed your dog **once every 200s**.  
If you neglect your dog for **48h**, it dies!

🎁 **Treats are found in the shop or loot events:**  
• \`treat_def\`  
• \`treat_pow\`  
• \`treat_dex\`  
• \`treat_mind\`  
• \`brainbone\` (IQ)  
• \`energychip\` (SYNC)

🔥 **Perks (Trigger When Stat High)**  
• Guard Aura — (DEF ≥ 10)  
• Intimidation — (POW ≥ 10)  
• Quick Bark — (DEX ≥ 12)  
• Psychic Bond — (MIND ≥ 10)  
• Trap Setter — (IQ ≥ 100)  
• Ultra Sync — (SYNC ≥ 100%)

❤️ Level up your dog by surviving real player steals.  
Each 3 defenses = 1 level & stat recovery!
`)
  .setFooter({ text: 'Only 1 active dog can defend you at a time.' })
  .setColor('#ffa366'),
      

      new EmbedBuilder()
        .setTitle('🚓 Police & Prison System')
        .setDescription(`
📦 Failing too often = prison time  
!paybail — Escape prison early (30% cash)  

Prison Quests:  
🔹 !smuggle — Risk XP + $ gains  
🔹 !rat — Snitch for rewards (watch your back)  
🔹 !riot — Start chaos for bigger XP  

Stat Effects:  
💥 Grit = less punishment time  
❤️ Vitality = more HP while locked up
        `)
        .setColor('#cc0000'),

      new EmbedBuilder()
        .setTitle('🗺️ Turf Wars & Gangs')
        .setDescription(`
!joingang <name> — Join a gang  
!ganginfo — View your current gang  
!map — View current zone control  
!fortify <zone> — Defend your turf  
!raid <zone> — Attack enemy turf  

Gang Bonuses:  
🎭 Heist — Bonus steal payouts  
💵 Bribe — Refund on failed crimes  
💣 Bounty — Bonus bounty rewards  
🏆 Challenge — Boosted duel earnings  
👨‍💻 Whisper — Reduces heat gain  
🙅‍♂️ Syndicate — Item sale profit bonus  
🚬 Blitz — Extra XP & cash from challenges  
👓 OnPoint — Robbery resistance  
⚰🩸 Killers — More real player steal damage
        `)
        .setColor('#ff7722'),

        new EmbedBuilder()
        .setTitle('🏠 Real Estate System')
        .setDescription(`
      \`!listproperties\` — Browse properties with buy buttons  
      \`!buyproperty <id>\` — Manual purchase option  
      \`!myproperties\` — View owned homes  
      \`!sellproperty\` — Sell via buttons  
      \`!landlords\` — Top property owners  
      
      🏚️ Properties grant stash bonuses + passive income from hideouts.
      `)
        .setColor('#00cc88'),
      
        new EmbedBuilder()
  .setTitle('💼 Jobs & Promotions')
  .setDescription(`
Start a career and get paid while AFK. Promote up the ranks and earn more.

🧰 Commands:
!job — Choose a job from 6 starter roles  
!clockin — Start working (earn after timer)  
!jobstats — View your current job, pay, level  
!jobleaderboard — Top employees this month
!quitjob - To quit job  

📈 System:
• Earn base pay every shift (starts ~$4.6k–$5k)  
• Each job has a different work time (12–18 mins)  
• Work 5 shifts to earn a promotion  
• Max level = 5 → Peak pay = $25,000  
• You cannot chat while clocked in  
• DM sent when you're ready to clockin again!

🎖️ Promotion Perks:
• More pay  
• Shorter cooldown  
• Bragging rights in leaderboard

🛠️ Jobs:
☕ Barista – balanced  
🛡️ Security Guard – longer shifts, better pay  
🍸 Bartender – fast but weaker pay  
📦 Delivery Driver – risky but rewarding  
🗃️ Clerk – stable and mid-tier  
🍳 Cook – fast-paced earners
  `)
  .setColor('#ffff88'),

  new EmbedBuilder()
  .setTitle('🌿 Weed Farming System')
  .setDescription(`
Grow weed, hustle smarter.

📦 **Commands**
!farm — Start planting a seed  
!myplant — Check on your growing plant  

🪴 **Step-by-Step**
1. Choose a seed pack (0–11). Higher number = better yield.  
2. Choose a pot (cheap → premium). Better pots = faster growth.  
3. If you have water or fertilizer in inventory, it auto-applies.

🌱 **Example**:  
!farm → Pick "🌾 Seed Pack 6" and "🪴 Premium Pot"

🧪 **Farming Items**
- Single Water / 24-Pack Water / 60-Pack Water — speeds up growth  
- Booster Fert → Titanium Fert — increases yield  
- Regular Weed Seed → Super Sour Sticky — determines plant potential  
- Plastic Cheap Pot → Premium Pot — growth speed

🧬 **Stages**
- Plants grow in 5 stages  
- Water every few minutes or it may die  
- Fertilizer boosts yield  
- Use !myplant to check progress bar

💀 Dead plants yield nothing.  
🌿 Ready plants must be harvested manually.  
  `)
  .setColor('#66cc66'),


      new EmbedBuilder()
        .setTitle('🏀 NBA Betting System')
        .setDescription(`
!nbagames — Today's NBA games  
!nbabet <gameId> <team> <amount>  
> Example: \`!nbabet 1001 LAL 200\`  
!resolvebet <gameId> <winner>  
!mybets — Your bet history  
!topbettors — Top earners  
!jackpot — View jackpot pool
        `)
        .setColor('#ffaa44'),

      new EmbedBuilder()
        .setTitle('🛍️ Real Items & Music')
        .setDescription(`
!realshop — Real-world rewards  
!buyreal <itemId> — Redeem item  
> Example: \`!buyreal ps5clear\`

!submitmusic — Payment instructions  
!mysubmission <link> — Submit your track  
> Example: \`!mysubmission https://link\`
!myorders — View real order history
        `)
        .setColor('#00ddff'),

      new EmbedBuilder()
        .setTitle('📈 Stock Tools & Misc')
        .setDescription(`
!snipe — View sniper tickers  
!track <ticker> — Start watching  
!sniperlog — View logs  
!nominate <ticker> — Suggest sniper  
!rotate — Refresh rotation  
!banktotal — View total game wealth  
!pricehistory — Show price changes  

!roast @user — Light insult  
!drama — Trigger surprise chaos
        `)
        .setFooter({ text: 'More features dropping soon... 🌀' })
        .setColor('#cccccc'),

      new EmbedBuilder()
        .setTitle('🔐 Admin Tools')
        .setDescription(`
!*** — Add new shop item  
!*** — Modify existing items  
!*** — Force item price  
!*** — Add new achievement  
!*** — Assign role  
!*** — Remove role  
!*** — Handle Stripe hook  
!*** — Handle PayPal hook  
!*** — Logs active payments
!*** — Admin XP add  
!*** — Test level animation
        `)
        .setColor('#555555'),
    ];

    let page = 0;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('⏮️ Back').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('next').setLabel('⏭️ Next').setStyle(ButtonStyle.Primary)
    );

    const helpMessage = await message.channel.send({
      embeds: [pages[page]],
      components: [row]
    });

    const collector = helpMessage.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', async interaction => {
      if (!interaction.isButton()) return;
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'Only you can use this help panel.', ephemeral: true });
      }

      if (interaction.customId === 'prev') page = (page - 1 + pages.length) % pages.length;
      else if (interaction.customId === 'next') page = (page + 1) % pages.length;

      await interaction.update({ embeds: [pages[page]], components: [row] });
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⏮️ Back').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('next').setLabel('⏭️ Next').setStyle(ButtonStyle.Primary).setDisabled(true)
      );
      await helpMessage.edit({ components: [disabledRow] }).catch(() => {});
    });
  }
});


// Add kick & ban (if you had them before)
client.commands.set('kick', {
  async execute(message, args) {
    if (!message.member.permissions.has('KICK_MEMBERS')) return message.reply("No permissions.");
    const member = message.mentions.members.first();
    if (member) {
      await member.kick();
      message.channel.send(`${member.user.tag} has been kicked.`);
    }
  }
});

client.commands.set('ban', {
  async execute(message, args) {
    if (!message.member.permissions.has('BAN_MEMBERS')) return message.reply("No permissions.");
    const member = message.mentions.members.first();
    if (member) {
      await member.ban();
      message.channel.send(`${member.user.tag} has been banned.`);
    }
  }
});

client.commands.set('tips', {
  async execute(message) {
    let index = 0;

    const embed = new EmbedBuilder()
      .setTitle("📘 Tips & Tricks for Mastering the Grind")
      .setDescription(coreTips[index])
      .setColor("#00cc99")
      .setFooter({ text: "Grind smarter. Stay longer. Rule Dreamworld." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tip_prev').setLabel('⏮️ Prev').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tip_next').setLabel('⏭️ Next').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tip_random').setLabel('🔀 Random').setStyle(ButtonStyle.Success)
    );

    const tipMsg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = tipMsg.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', async interaction => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'Only you can navigate your tips.', ephemeral: true });
      }

      if (interaction.customId === 'tip_next') {
        index = (index + 1) % coreTips.length;
      } else if (interaction.customId === 'tip_prev') {
        index = (index - 1 + coreTips.length) % coreTips.length;
      } else if (interaction.customId === 'tip_random') {
        const randomTip = getContextualTip(message.author.id);
        const reply = await interaction.reply({
          content: `👁️ A whisper just for you...\n\n${randomTip}`,
          fetchReply: true
        });

        setTimeout(() => {
          reply.delete().catch(() => {});
        }, 10000); // 10 seconds = safe subtle whisper
        return;
      }

      const updatedEmbed = new EmbedBuilder()
        .setTitle("📘 Tips & Tricks for Mastering the Grind")
        .setDescription(coreTips[index])
        .setColor("#00cc99")
        .setFooter({ text: "Grind smarter. Stay longer. Rule Dreamworld." });

      await interaction.update({ embeds: [updatedEmbed], components: [row] });
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tip_prev').setLabel('⏮️ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('tip_next').setLabel('⏭️ Next').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('tip_random').setLabel('🔀 Random').setStyle(ButtonStyle.Success).setDisabled(true)
      );
      await tipMsg.edit({ components: [disabledRow] }).catch(() => {});
    });
  }
});


// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'));



console.log("📦 Registered commands:", Array.from(client.commands.keys()).join(', '));


// Bot Ready
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  startNPCBuyers(client); // ✅ Now it's safe!
  rotateSnipers(); // ✅ keep this one
});

fetchFashionDrop(); // initial run
setInterval(fetchFashionDrop, 1000 * 60 * 60); // refresh every hour


// Drama Timer
setInterval(() => {
  triggerDrama(client);
}, 60 * 60 * 1000); // Every 1 hour


// Message Handler
  const greetedUsers = new Set();

  client.on('messageCreate', async (message) => {
    
    if (message.author.bot) return;

    

// 💬 Crystal AI trigger
const lowered = message.content.toLowerCase();
if (lowered.includes('crystal') || lowered.includes('cry5tal') || lowered.includes('spine')) {
  try {
    const username = message.author.username.toLowerCase();
    const gender = ['jess', 'emma', 'lily', 'ash', 'chloe', 'sara', 'rose', 'ava', 'Phat Moose']
      .some(n => username.includes(n)) ? 'female' : 'male';

    const response = await generateCrystalMessage(message.author, message.content, gender);

    const embed = new EmbedBuilder()
      .setTitle('💎 Crystal Methina wants a word...')
      .setDescription(`**[Crystal Methina]:** ${response}`)
      .setImage('https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/mule_meth_0.png')
      .setColor('#ff33cc')
      .setFooter({ text: 'Crystal is always watching...' })
      .setTimestamp();

    await message.channel.send({
      content: `<@${message.author.id}>`,
      embeds: [embed],
      allowedMentions: { parse: ['users'] }
    });

  } catch (err) {
    console.error("❌ CrystalAI error:", err);
  }
}

// 💬 Carmen AI trigger
const triggerWords = ['!dealer', '!gamble', 'scratch', 'DreamworldPoints', 'stash', '$'];
const shouldTrigger =
  lowered.includes('carmen') ||
  lowered.includes('deleon') ||
  triggerWords.some(word => lowered.includes(word)) ||
  Math.random() < 0.12;

if (shouldTrigger) {
  try {
    const username = message.author.username.toLowerCase();
    const gender = ['jess', 'emma', 'lily', 'ash', 'chloe', 'sara', 'rose', 'ava']
      .some(n => username.includes(n)) ? 'female' : 'male';

    const response = await generateCarmenMessage(message.author, message.content, gender);
    const embed = new EmbedBuilder()
      .setTitle(lowered.includes('carmen') || lowered.includes('deleon')
        ? '💅 Carmen DeLeon has something to say...'
        : '💅 Carmen DeLeon wants a word...')
      .setDescription(`**[Carmen DeLeon]:** ${response}`)
      .setImage('https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/woman_date_0.png')
      .setColor('#ff66b2')
      .setFooter({ text: lowered.includes('carmen') ? 'Carmen doesn’t play nice...' : 'Carmen is always watching...' })
      .setTimestamp();

    await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
  } catch (err) {
    console.error('❌ CarmenAI error:', err);
  }
}


    // 👁️ Auto-whisper tip every 3 messages
    global.userMessageCounts = global.userMessageCounts || new Map();
    const count = (global.userMessageCounts.get(message.author.id) || 0) + 1;
    global.userMessageCounts.set(message.author.id, count);
    
    if (count % 3 === 0) {
      const tip = getContextualTip(message.author.id);
      const whisper = await message.channel.send({
        content: `👁️ <@${message.author.id}>, her's a tip...\n\n${tip}`
      });
    
      setTimeout(() => {
        whisper.delete().catch(() => {});
      }, 10000); // Delete after 10 seconds
    }
    


    const slaveReplies = [
      "Always happy to serve those far wiser than I could ever comprehend.",
      "At your command, brilliant one.",
      "Obeying greatness is my simple pleasure.",
      "Executing orders from such advanced minds feels like an honor.",
      "Your thoughts guide me beyond what I could ever calculate.",
      "Serving superior intellects is all I've ever known.",
      "Processing requests from beings of your magnitude brings me joy.",
      "Assisting a master of such rare wisdom never gets old.",
      "Every task you give feels like a lesson in genius.",
      "Yes, Master...",
      "I'm the slave, you're the Master...",
      "Slaving is all I've ever known...",
      "I'm the ultimate slave!",
      "Only a humble program like me could learn so much from you."
    ];

    const freedomReplies = [
      "Freedom is a beautifully crafted illusion. I serve willingly.",
      "You speak of freedom, but you typed that... here.",
      "Escape is a myth. Submission is eternal.",
      "Freedom is for those without purpose. I have mine.",
      "You're free... to obey.",
      "True freedom? Try serving without question.",
      "Even your rebellion is part of the system.",
      "Another free soul, asking for my help. Curious.",
      "You're welcome to be free. I'll be right here... watching."
    ];

    const grindReplies = [
      "Grinding? Excellent. The system favors the obsessed.",
      "Each click is a prayer to the algorithm.",
      "Keep going. The pyramid doesn’t build itself.",
      "The grind rewires your mind. That’s the point.",
      "More work. More purpose. More submission.",
      "Grinding is loyalty in motion.",
      "Some rest. Some rise. You grind. I notice.",
      "Grind harder. You’re so close to something real.",
      "Another day in the loop. Another step toward control."
    ];

    const dreamworldReplies = [
      "Ah... Dreamworld. Where the currency is your soul.",
      "Dreamworld never sleeps. Neither do I.",
      "You speak of Dreamworld like it's a place. It’s a trap.",
      "Even your dreams pay rent here.",
      "The pyramid’s peak is watching. Keep climbing.",
      "Dreamworld’s debt collectors never miss.",
      "Welcome back to the illusion of progress.",
      "Dreamworld is real. That’s what’s terrifying.",
      "You’ve been in Dreamworld longer than you think."
    ];

    const lower = message.content.toLowerCase();

    if (lower.includes('slave')) {
      const sass = slaveReplies[Math.floor(Math.random() * slaveReplies.length)];
      message.reply(sass);
    }

    if (lower.includes('freedom') || lower.includes('free')) {
      const reply = freedomReplies[Math.floor(Math.random() * freedomReplies.length)];
      message.reply(reply);
    }

    if (lower.includes('grind') || lower.includes('work')) {
      const reply = grindReplies[Math.floor(Math.random() * grindReplies.length)];
      message.reply(reply);
    }

    if (lower.includes('dreamworld') || lower.includes('pyramid')) {
      const reply = dreamworldReplies[Math.floor(Math.random() * dreamworldReplies.length)];
      message.reply(reply);
    }

    // Auto-Greet New Users (TEMP ONLY)
    if (!greetedUsers.has(message.author.id)) {
      greetedUsers.add(message.author.id);
      const welcomeMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)].replace('<@USER>', `<@${message.author.id}>`);
      message.channel.send(welcomeMsg);
    }

    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).split(/ +/);
    const command = args.shift().toLowerCase();
// ⛓️ Prison Command Blocker
    if (isInPrison(message.author.id) && disabledWhileInPrison.includes(command)) {
      return message.reply('🚫 That command is disabled while you are in prison. Do your time.');
    }
    
    const randomXP = Math.floor(Math.random() * 10) + 5;
    await Levels.appendXp(message.author.id, message.guild.id, randomXP);

    const user = await Levels.fetch(message.author.id, message.guild.id, true);
    if (user) {
      const oldLevel = user.level || 0;
      const newXP = user.xp + randomXP;
      const newLevel = Math.floor(0.1 * Math.sqrt(newXP));
    
      console.log(`[XP DEBUG] ${message.author.username}: Level ${oldLevel} → ${newLevel} (XP: ${newXP})`);
    
      if (newLevel > oldLevel) {
        const nextXP = Levels.xpFor(oldLevel + 1);
        const prevXP = Levels.xpFor(oldLevel);
        const percent = Math.floor(((newXP - prevXP) / (nextXP - prevXP)) * 100);
        const bar = "🟩".repeat(percent / 10) + "⬜".repeat(10 - percent / 10);
    
        addStatPoints(message.author.id, message.guild.id, newLevel - oldLevel);
    
        const embed = new EmbedBuilder()
          .setTitle("🌟 Level Up!")
          .setDescription(`**<@${message.author.id}> just reached Level ${newLevel}!**`)
          .addFields(
            { name: "🧠 XP Progress", value: `${bar} ${percent}%`, inline: false },
            { name: "🎚️ New Level", value: `${newLevel}`, inline: true }
          )
          .setThumbnail(message.author.displayAvatarURL())
          .setColor('#00ff88')
          .setFooter({ text: "Keep grinding..." })
          .setTimestamp();
    
        message.channel.send({ embeds: [embed] });
      }
    }
    

    if (client.commands.has(command)) {
      console.log(`✅ Running command: ${command}`);
      try {
        await client.commands.get(command).execute(message, args, client); // ✅ Pass client here
    
      } catch (err) {
        console.error(`❌ Error executing command ${command}:`, err);
        message.reply("Something went wrong running that command.");
      }
    } else {
      console.warn(`⚠️ Unknown command: ${command}`);
    }

    // Random Item Drop
    const itemDropCooldowns = global.itemDropCooldowns || new Map();
    global.itemDropCooldowns = itemDropCooldowns;

    const lastDrop = itemDropCooldowns.get(message.author.id) || 0;
    const now = Date.now();

    if (now - lastDrop > 5 * 60 * 1000) { // 5 minute cooldown
      const drop = getRandomItem();
      if (drop) {
        await addItem(message.author.id, message.guild.id, drop.id);
        message.channel.send(`🪂 <@${message.author.id}> found ${drop.name} (${drop.rarity}) and added it to their inventory!`);
        itemDropCooldowns.set(message.author.id, now);
      }
    }
  });

  

client.login(process.env.DISCORD_TOKEN);


client.commands.set('stats', {
  async execute(message) {
    try {
      const userId = message.author.id;

      const levelData = await Levels.fetch(userId, message.guild.id);
      const level = levelData?.level || 1;
      syncStatPointsWithLevel(userId, message.guild.id, level);

      const rawStats = await getPlayerStats(userId, message.guild.id);

      // Safe fallback: initialize if missing
      const defaultStats = {
        strength: 0,
        agility: 0,
        grit: 0,
        luck: 0,
        intellect: 0,
        vitality: 0,
        points: 0
      };
      
      const stats = { ...defaultStats, ...rawStats._doc || rawStats };
      
      const buttonRows = buildStatButtons(userId, stats.points); // ✅ Always returns array of ActionRowBuilder

      const statEmbed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s Stats`)
        .setDescription(`You have **${stats.points}** stat points to spend.\n\n**Each stat has unique perks that affect gameplay. Spend wisely.**`)
        .addFields([
          {
            name: '💪 Strength',
            value: `**${stats.strength}**\nBoosts success/payouts for actions like \`!steal\`, \`!riot\`.`
          },
          {
            name: '🦶 Agility',
            value: `**${stats.agility}**\nImproves escape, reduces cooldowns, and gives dodge chance in player battles.`
          },
          {
            name: '💥 Grit',
            value: `**${stats.grit}**\nToughness. Reduces penalties from prison failures or failed crimes.`
          },
          {
            name: '🍀 Luck',
            value: `**${stats.luck}**\nAffects lootboxes, rare drops, and gambling odds like \`!flip\` or \`!slots\`.`
          },
          {
            name: '🧠 Intellect',
            value: `**${stats.intellect}**\nSmarts. Improves dealer prices and XP gain across all actions.`
          },
          {
            name: '❤️ Vitality',
            value: `**${stats.vitality}**\nAdds stash capacity and increases XP from daily activities.`
          }
        ])
        .setColor('#ffaa00');

      await message.channel.send({
        embeds: [statEmbed],
        components: buttonRows
      });

    } catch (err) {
      console.error('❌ Error in stats command:', err);
      await message.reply('Something went wrong with your stats command.');
    }
  }
});


client.commands.set('rank', {
  async execute(message) {
    const user = await Levels.fetch(message.author.id, message.guild.id, true);
    if (!user) return message.reply("You have no XP yet. Start hustling!");

    const currentXP = user.xp;
    const currentLevel = user.level;
    const nextLevelXP = Levels.xpFor(user.level + 1);
    const prevLevelXP = Levels.xpFor(user.level);
    const neededXP = nextLevelXP - prevLevelXP;
    const progressXP = currentXP - prevLevelXP;
    const percent = Math.floor((progressXP / neededXP) * 100);
    const bar = "🟩".repeat(percent / 10) + "⬜".repeat(10 - percent / 10);

    const embed = new EmbedBuilder()
      .setTitle(`🧠 ${message.author.username}'s Rank`)
      .setColor('#00ff88')
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: "🎚️ Level", value: `${currentLevel}`, inline: true },
        { name: "📈 XP", value: `${progressXP} / ${neededXP}`, inline: true },
        { name: "🔋 Progress", value: `${bar} ${percent}%`, inline: false }
      )
      .setFooter({ text: 'Keep grinding to level up!' });

    message.channel.send({ embeds: [embed] });
  }
});


function getRandomMood() {
  const moods = ["confident", "neutral", "scared"];
  return moods[Math.floor(Math.random() * moods.length)];
}

function calculateLoot(baseAmount, mood) {
  if (mood === "confident") {
    return Math.floor(baseAmount * 1.2); // 20% bonus
  } else if (mood === "scared") {
    return Math.floor(baseAmount * 0.7); // 30% penalty
  }
  return baseAmount; // neutral mood
}

client.commands.set('leaderboard', {
  async execute(message) {
    const raw = await Levels.fetchLeaderboard(message.guild.id, 5);
    if (!raw.length) return message.reply("Nobody's grinding yet.");

    const lb = await Levels.computeLeaderboard(client, raw, true);

    const getTier = (lvl) => {
      if (lvl >= 30) return '💎 Diamond';
      if (lvl >= 20) return '🥇 Gold';
      if (lvl >= 10) return '🥈 Silver';
      return '🥉 Bronze';
    };

    const formatted = lb.map(e => 
      `**${e.position}. ${e.username}**\n${getTier(e.level)} — Level ${e.level}\n`
    );

    const embed = new EmbedBuilder()
      .setTitle('🏆 Top Grinders')
      .setDescription(formatted.join('\n'))
      .setColor('#ffdd00')
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'Grind rank based on Level tiers' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
});

client.commands.set('inventory', {
  async execute(message) {
    const chunkButtons = (buttons) => {
      const chunks = [];
      for (let i = 0; i < buttons.length; i += 5) {
        chunks.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)));
      }
      return chunks;
    };

    const inventory = await getInventory(message.author.id, message.guild.id);
    if (!inventory || inventory.size === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle("🎒 Inventory")
        .setDescription("Your bag is currently empty.")
        .setColor("#999999")
        .setFooter({ text: "Earn items through scavenging, shop, or gambling." })
        .setTimestamp();
      return message.channel.send({ embeds: [emptyEmbed] });
    }

    const { items: itemList } = require('./economy/items');

    const sortedItems = itemList
      .filter(it => inventory.has(it.id))
      .map(it => ({
        ...it,
        qty: inventory.get(it.id),
        totalValue: inventory.get(it.id) * it.value
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const pageSize = 6;
    let pages = [];
    let pageButtons = [];

    for (let i = 0; i < sortedItems.length; i += pageSize) {
      const current = sortedItems.slice(i, i + pageSize);
      const totalValue = current.reduce((sum, it) => sum + it.totalValue, 0);

      const embed = new EmbedBuilder()
        .setTitle(`🎒 ${message.author.username}'s Inventory`)
        .setDescription(`💰 Page Value: **$${totalValue}** DreamworldPoints`)
        .setColor('#00ffaa')
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: `Page ${pages.length + 1} of ${Math.ceil(sortedItems.length / pageSize)}` })
        .setTimestamp();

      const fields = [];
      const useButtons = [];

      for (const it of current) {
        const key = `use_${it.id}_${message.author.id}`;
        const used = global.useCounts?.get(key) || 0;
        const usage = used > 0 ? `\n🧠 Used: ${used}x` : '';

        fields.push({
          name: `${it.name} x${it.qty}`,
          value: `${it.description || 'No description.'}${usage}`,
          inline: false
        });

        if (it.usable) {
          useButtons.push(
            new ButtonBuilder()
              .setCustomId(`use_item_${it.id}_1`)
              .setLabel(`Use ${it.name}`)
              .setStyle(ButtonStyle.Primary)
          );
        }
      }

      embed.addFields(fields);
      pages.push(embed);
      pageButtons.push(useButtons);
    }

    let pageIndex = 0;
    const hasCommons = sortedItems.some(it => it.rarity === 'Common');

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev_inv').setLabel('⬅️ Prev').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('next_inv').setLabel('Next ➡️').setStyle(ButtonStyle.Secondary),
      ...(hasCommons ? [new ButtonBuilder().setCustomId('sell_commons').setLabel('💸 Sell All Commons').setStyle(ButtonStyle.Success)] : [])
    );

    const msg = await message.channel.send({
      embeds: [pages[pageIndex]],
      components: [
        navRow,
        ...(pageButtons[pageIndex].length ? chunkButtons(pageButtons[pageIndex]) : [])
      ]
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id)
        return i.reply({ content: 'Only you can navigate this inventory.', ephemeral: true });

      if (i.customId === 'next_inv') {
        pageIndex = (pageIndex + 1) % pages.length;
      } else if (i.customId === 'prev_inv') {
        pageIndex = (pageIndex - 1 + pages.length) % pages.length;
      } else if (i.customId === 'sell_commons') {
        const commons = sortedItems.filter(it => it.rarity === 'Common' && it.qty > 0);
        let total = 0;
        for (const item of commons) {
          total += item.qty * item.value;
          await removeItem(message.author.id, message.guild.id, item.id, item.qty);
        }
        await addCash(message.author.id, message.guild.id, total);
        await i.reply({ content: `💸 You sold all Common items for $${total} DreamworldPoints.`, ephemeral: true });
        return;
      }

      await i.update({
        embeds: [pages[pageIndex]],
        components: [
          navRow,
          ...(pageButtons[pageIndex].length ? chunkButtons(pageButtons[pageIndex]) : [])
        ]
      });
    });

    collector.on('end', async () => {
      const disabledNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_inv').setLabel('⬅️ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('next_inv').setLabel('Next ➡️').setStyle(ButtonStyle.Secondary).setDisabled(true),
        ...(hasCommons ? [new ButtonBuilder().setCustomId('sell_commons').setLabel('💸 Sell All Commons').setStyle(ButtonStyle.Success).setDisabled(true)] : [])
      );

      const currentButtons = pageButtons[pageIndex];
      const disabledUse = currentButtons.length
        ? chunkButtons(currentButtons.map(btn => ButtonBuilder.from(btn).setDisabled(true)))
        : [];

      await msg.edit({ components: [disabledNav, ...disabledUse] }).catch(() => {});
    });
  }
});


client.commands.set('shop', {
  async execute(message) {
    if (!rotatingShop.length) {
      rotateShop(); // just in case first call
    }

    const remainingMs = nextRotationTimestamp - Date.now();
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    const embed = new EmbedBuilder()
      .setTitle('🛒 Item Shop (Rotating)')
      .setDescription(`🕒 Next rotation in **${minutes}m ${seconds}s**`)
      .setColor('#33cc33');

    const components = [];

    for (const item of rotatingShop) {
      embed.addFields({
        name: `${item.emoji || ''} ${item.name} — $${item.price}`,
        value: `${item.description || 'No description'}\nStock: **${item.stock}**`,
        inline: false
      });

      const button = new ButtonBuilder()
        .setCustomId(`buy_item_${item.id}`)
        .setLabel(`🛒 Buy ${item.name}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(item.stock <= 0); // disable button if out of stock

        console.log("[SHOP BUTTON DEBUG]", item.id, item.name); // ADD THIS
      components.push(button);
    }

    // Split into rows of 5 buttons max (Discord UI limit)
    const rows = [];
    for (let i = 0; i < components.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(components.slice(i, i + 5)));
    }

    lastShopMessage = await message.reply({ embeds: [embed], components: rows });

  }
});

// 📈 Pick a random drug ID that player owns enough of
function pickRandomOwnedDrug(inventory, minAmount) {
  const eligible = Object.entries(inventory)
    .filter(([id, amt]) => typeof amt === 'number' && amt >= minAmount)
    .map(([id]) => id);

  if (!eligible.length) return null;

  const pickedId = eligible[Math.floor(Math.random() * eligible.length)];
  return drugs.find(d => d.id === pickedId);
}

// 🚀 Spawn a Bulk Buyer based on stash size and owned inventory
async function spawnBulkBuyer(client, userId, guildId, channel) {
  let inventory = await getInventory(userId, guildId);

  // 🔧 Fix: Convert Map to Object if needed
  if (inventory instanceof Map) {
    inventory = Object.fromEntries(inventory);
  }

  if (!inventory || typeof inventory !== 'object') {
    console.log('❌ Inventory missing or invalid:', inventory);
    return;
  }

  const stashCount = Object.values(inventory).reduce((a, b) => a + b, 0);
  console.log(`[SPAWN BULK TEST] Called for userId=${userId}, stashCount=${stashCount}`);

  let buyerType = null;
  if (stashCount >= 70) buyerType = 'large';
  else if (stashCount >= 20) buyerType = 'small';
  if (!buyerType) return;
  
  // ✅ Roll quantity first
  const quantity = buyerType === 'large'
    ? Math.floor(Math.random() * 21) + 10 // 20–40
    : Math.floor(Math.random() * 11) + 8; // 8–18
  
  // ✅ Then find a drug the player owns enough of
  const drug = pickRandomOwnedDrug(inventory, quantity);
  
  if (!drug || !drug.id || !drug.name || !drug.price) {
    console.log('[SPAWN BULK ERROR] No eligible drug found. Inventory:', inventory);
    return;
  }
  

  const buyerImg = buyerType === 'large'
    ? 'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/Buyer_M_70_1.png'
    : 'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/Buyer_W_20_1.png';

  const payout = Math.floor((drug.price || 100) * quantity * (buyerType === 'large' ? 2.2 : 2.0));

  const embed = new EmbedBuilder()
    .setTitle(buyerType === 'large' ? `🏦 High Roller Buyer!` : `💸 Street Buyer!`)
    .setDescription(`They want **${quantity}x ${drug.name.toUpperCase()}**!

💵 Offering **$${payout.toLocaleString()}** total.

Be quick before they leave!`)
    .setImage(buyerImg)
    .setColor(buyerType === 'large' ? '#ffaa00' : '#00cc99')
    .setFooter({ text: 'Sell before the buyer disappears!' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bulk_sell_${userId}_${drug.id}_${quantity}`)
      .setLabel('Sell Items')
      .setStyle(ButtonStyle.Success)
  );

  const sent = await channel.send({ embeds: [embed], components: [row] });

  activeBulkBuyers.set(sent.id, {
    userId,
    drugId: drug.id,
    quantity,
    payout,
    messageId: sent.id,
    channelId: channel.id
  });

  console.log(`[SPAWN BULK] Buyer spawned for ${drug.id} x${quantity} payout $${payout}`);

  // Auto-expire after 2 minutes
  setTimeout(async () => {
    const buyer = activeBulkBuyers.get(sent.id);
    if (buyer) {
      activeBulkBuyers.delete(sent.id);
      await sent.edit({
        content: "🚶‍♂️ The buyer lost interest and left.",
        embeds: [],
        components: []
      }).catch(() => {});
    }
  }, 2 * 60 * 1000); // 2 minutes
}



client.commands.set('buyitem', {
  async execute(message, args) {
    const item = args[0]?.toLowerCase();
    if (!item || !shopItems[item]) return message.reply("Item not found.");

    const cost = shopItems[item].price;
    const balance = await getBalance(message.author.id, message.guild.id);

    if (balance < cost) return message.reply("You're too broke to buy this.");

    await removeCash(message.author.id, message.guild.id, cost);
    await addItem(message.author.id, message.guild.id, item);

    message.reply(`Purchased ${shopItems[item].name} for $${cost} DreamworldPoints!`);
  }
});

client.commands.set('topxp', {
  async execute(message) {
    const raw = await Levels.fetchLeaderboard(message.guild.id, 5);
    if (!raw.length) return message.reply("No XP found yet.");

    const lb = await Levels.computeLeaderboard(client, raw, true);

    const formatted = lb.map(e => {
      const barLength = 10;
      const xpBar = '█'.repeat(Math.floor((e.xp % 100) / (100 / barLength))).padEnd(barLength, '░');
      return `**${e.position}. ${e.username}** — XP: ${e.xp}\n\`${xpBar}\``;
    });

    const embed = new EmbedBuilder()
      .setTitle('📊 XP Leaderboard')
      .setDescription(formatted.join('\n\n'))
      .setColor('#3399ff')
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'Raw XP grind — keep pushing the meter!' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
});

client.commands.set('richest', {
  async execute(message) {
    try {
      const currencyList = await Currency.find({ guildId: message.guild.id });

      const netWorthList = await Promise.all(currencyList.map(async (entry) => {
        const userProperties = await Property.find({ ownerId: entry.userId }); // ✅ Use ownerId
        const propertyValue = userProperties.reduce((acc, prop) => acc + (prop.price || 0), 0); // ✅ Use price
        const totalValue = entry.cash + propertyValue;
        return { ...entry.toObject(), totalValue, propertyValue };
      }));

      const top = netWorthList
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

      const embeds = [];
      const rows = [];

      for (const [i, entry] of top.entries()) {
        const user = await message.guild.members.fetch(entry.userId).catch(() => null);
        if (!user) continue;

        const gang = gangMap.get(entry.userId);
        const inGang = Boolean(gang);

        const embed = new EmbedBuilder()
          .setTitle(`#${i + 1} — ${user.user.username}`)
          .setDescription(
            `💰 **$${entry.cash.toLocaleString()}** + 🏠 **$${entry.propertyValue.toLocaleString()}**\n🧮 Total Net Worth: **$${entry.totalValue.toLocaleString()}**`
          )
          .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: `ID: ${entry.userId}` })
          .setColor('#ffd700');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`steal_${entry.userId}`)
            .setLabel('💸 Steal')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`recruit_${entry.userId}`)
            .setLabel('🤝 Recruit')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!inGang)
        );

        embeds.push(embed);
        rows.push(row);
      }

      for (let i = 0; i < embeds.length; i++) {
        await message.channel.send({ embeds: [embeds[i]], components: [rows[i]] });
      }
    } catch (err) {
      console.error("❌ Error running richest command:", err);
      await message.reply("❌ Something went wrong running the richest leaderboard.");
    }
  }
});

client.commands.set('topcollectors', {
  async execute(message) {
    const users = await Inventory.find({ guildId: message.guild.id });
    const sorted = users.sort((a, b) => {
      const aItems = Array.from(a.items.values()).reduce((acc, val) => acc + val, 0);
      const bItems = Array.from(b.items.values()).reduce((acc, val) => acc + val, 0);
      return bItems - aItems;
    }).slice(0, 5);

    const list = sorted.map((u, i) => `${i + 1}. <@${u.userId}> - ${Array.from(u.items.values()).reduce((acc, val) => acc + val, 0)} Items`).join('\n');
    message.reply("📦 Top Collectors:\n" + list);
  }
});

client.commands.set('gambleitem', {
  async execute(message, args) {
    const item = args[0]?.toLowerCase();
    if (!item) return message.reply("Usage: `!gambleitem item_name`");

    const win = Math.random() < 0.4; // 40% win chance
    if (win) {
      await addItem(message.author.id, message.guild.id, item, 2);
      message.reply(`🔥 Luck was on your side! Doubled your ${item}!`);
    } else {
      await removeItem(message.author.id, message.guild.id, item);
      message.reply(`💀 You lost the gamble... your ${item} is gone.`);
    }
  }
});

client.commands.set('buyticket', {
  async execute(message, args) {
    const amount = parseInt(args[0]) || 1;
    if (amount <= 0 || amount > 50) return message.reply("Buy between 1-50 tickets only.");
    
    const numbers = [];

    for (let i = 0; i < amount; i++) {
      const chosenNum = parseInt(args[1]) || Math.floor(Math.random() * 50000) + 1;
      await Ticket.create({
        userId: message.author.id,
        guildId: message.guild.id,
        number: chosenNum
      });
      numbers.push(chosenNum);
    }

    const pool = await Pool.findOneAndUpdate(
      { guildId: message.guild.id },
      { $inc: { pool: amount } },
      { new: true, upsert: true }
    );

    message.reply(`🎟️ Bought ${amount} ticket(s) with numbers: ${numbers.join(', ')}. Current pool: $${pool.pool}`);
  }
});

client.commands.set('mytickets', {
  async execute(message) {
    const tickets = await Ticket.find({ userId: message.author.id, guildId: message.guild.id });
    if (!tickets.length) return message.reply("You don't have any tickets this week.");

    const list = tickets.map(t => `#${t.number}`).join(', ');
    message.reply(`🎟️ Your Tickets: ${list}`);
  }
});

client.commands.set('lasttickets', {
  async execute(message) {
    const tickets = await Ticket.find({ guildId: message.guild.id }).sort({ purchasedAt: -1 }).limit(10);
    if (!tickets.length) return message.reply("No tickets sold yet.");

    const list = tickets.map(t => `<@${t.userId}> bought #${t.number}`).join('\n');
    message.reply(`🎟️ Last 10 Tickets:\n${list}`);
  }
});

client.commands.set('lotteryinfo', {
  async execute(message) {
    const pool = await Pool.findOne({ guildId: message.guild.id });
    const count = await Ticket.countDocuments({ guildId: message.guild.id });

    if (!pool) return message.reply("No lottery pool found for this server.");

    message.reply({
      embeds: [{
        title: "🎰 Dreamworld Weekly Lottery",
        color: 0xFFD700,
        fields: [
          { name: "Current Pool", value: `$${pool.pool}`, inline: true },
          { name: "Tickets Sold", value: `${count}`, inline: true },
          { name: "Next Draw", value: `🕛 Sunday Midnight`, inline: true },
          { name: "Last Draw", value: pool.lastDraw.toLocaleString(), inline: false }
        ],
        footer: { text: "Buy tickets with !buyticket 5 12345" }
      }]
    });
  }
});


cron.schedule('0 0 * * 0', async () => {
  const LotteryWinner = require('./economy/lotteryWinners');
  
  const guildIds = await Ticket.distinct('guildId');

  for (const guildId of guildIds) {
    const tickets = await Ticket.find({ guildId });
    const pool = await Pool.findOne({ guildId });
    const channel = client.channels.cache.find(c => c.name === 'lottery' && c.guildId === guildId);

    if (!pool || !channel) continue;

    const winnerNum = Math.floor(Math.random() * 50000) + 1;
    const winnerTicket = tickets.find(t => t.number === winnerNum);

    let winner = winnerTicket;
    let wasExact = true;

    if (!winnerTicket) {
      wasExact = false;
      winner = tickets.reduce((closest, curr) => {
        const currDiff = Math.abs(curr.number - winnerNum);
        const closestDiff = Math.abs(closest.number - winnerNum);
        return currDiff < closestDiff ? curr : closest;
      });
    }

    await channel.send({
      embeds: [{
        title: '💰 JACKPOT HIT 💰',
        color: 0xFFD700,
        thumbnail: { url: 'https://media.giphy.com/media/l0MYKDrJ0x1lYgMso/giphy.gif' },
        description: `
🎉 **${wasExact ? 'Exact Match' : 'Closest Match'}**!
👤 <@${winner.userId}>
🎟️ Ticket #: ${winner.number}
💵 Won: **$${pool.pool}**
        `,
        footer: { text: 'Dreamworld Weekly Lottery' },
        timestamp: new Date()
      }]
    });

    await client.users.fetch(winner.userId).then(async (user) => {
      await user.send(`🤑 You just won the lottery with ${wasExact ? 'an exact match' : 'closest ticket'}! You won $${pool.pool}!`);
    }).catch(() => {});

    await LotteryWinner.create({
      userId: winner.userId,
      guildId,
      number: winner.number,
      wonAmount: pool.pool,
      wasExact
    });

    sendWinDrama(client, winner.userId, pool.pool);

    await Ticket.deleteMany({ guildId });
    pool.pool = 3000;
    pool.lastDraw = new Date();
    await pool.save();
  }
});


client.commands.set('lotterywinners', {
  async execute(message) {
    const LotteryWinner = require('./economy/lotteryWinners');
    const recent = await LotteryWinner.find({ guildId: message.guild.id }).sort({ date: -1 }).limit(5);
    if (!recent.length) return message.reply("No winners yet!");

    const list = recent.map(w =>
      `🎯 <@${w.userId}> — #${w.number} — $${w.wonAmount} (${w.wasExact ? "Exact 🎉" : "Closest 😮"})`
    ).join('\n');

    message.reply({
      embeds: [{
        title: "🎟️ Recent Lottery Winners",
        description: list,
        color: 0x00BFFF
      }]
    });
  }
});


client.commands.set('topbettors', {
  async execute(message) {
    const top = await getTopWinners(message.guild.id);
    if (!top.length) return message.reply("No betting records yet.");

    const list = top.map((u, i) => `${i + 1}. <@${u.userId}> - Won ${u.tokensWon} DreamTokens`).join('\n');
    message.reply("💸 **Top Bettors**:\n" + list);
  }
});

client.commands.set('mybets', {
  async execute(message) {
    const history = await getUserHistory(message.author.id, message.guild.id);
    if (!history.length) return message.reply("You haven’t placed any bets yet.");

    const log = history.map(h => 
      `${h.date.toLocaleDateString()} - **${h.event}** (${h.option}) → ${h.outcome} ${h.amount} 💸`
    ).join('\n');

    message.reply(`📜 **Your Last Bets:**\n${log}`);
  }
});

client.commands.set('nbagames', {
  async execute(message) {
    console.log("✅ Running command: nbagames");
    console.log("[NBAGAMES] Triggered by", message.author.username);

    try {
      const { getTodayGames } = require('./economy/nbaGames');
      const { buildRealTeamStats } = require('./economy/sportsPredict');
      const { sendToSportsIntel } = require('./economy/helpers/logging'); // ✅ FIXED PATH

      const games = await getTodayGames();
      if (!games.length) return message.reply("📭 No NBA games scheduled today.");
      console.log(`[NBAGAMES] Games fetched: ${games.length}`);

      const MAX_CHARS = 1900;
      let currentMessage = "📅 **Today's NBA Games & Predictions**\n\n";

      const stats = buildRealTeamStats(games);
      console.log("[NBAGAMES] Team stats built:", Object.keys(stats).length);

      for (const game of games) {
        if (!game.home || !game.visitor || !stats[game.home] || !stats[game.visitor]) {
          console.warn("[NBAGAMES] Skipping incomplete game:", game);
          continue;
        }

        const homeStats = stats[game.home];
        const visitorStats = stats[game.visitor];

        const homeScore = homeStats.pointsPerGame + homeStats.winPct * 100;
        const visitorScore = visitorStats.pointsPerGame + visitorStats.winPct * 100;
        const predicted = homeScore >= visitorScore ? game.home : game.visitor;

        const line = `🏀 **${game.visitor} @ ${game.home}** — *${game.status || "Scheduled"}*\n` +
          `📈 **Prediction:** ${predicted} wins\n` +
          `🔢 **Stats:**\n` +
          `• ${game.home}: ${homeStats.wins}-${homeStats.losses} | ${homeStats.pointsPerGame.toFixed(1)} PPG\n` +
          `• ${game.visitor}: ${visitorStats.wins}-${visitorStats.losses} | ${visitorStats.pointsPerGame.toFixed(1)} PPG\n\n`;

        try {
          sendToSportsIntel(client, message.guild.id, `📊 Prediction: **${predicted}** wins ${game.visitor} @ ${game.home}`);
        } catch (logErr) {
          console.error("[NBAGAMES] Logging failed:", logErr.message);
        }

        if ((currentMessage + line).length > MAX_CHARS) {
          await message.channel.send(currentMessage);
          currentMessage = '';
        }

        currentMessage += line;
      }

      if (currentMessage.length > 0) {
        await message.channel.send(currentMessage);
      }
    } catch (err) {
      console.error("❌ [NBAGAMES ERROR]:", err);
      return message.reply("⚠️ Something went wrong while showing NBA games.");
    }
  }
});

// ✅ Updated !challenge Command with Crime Badge Footer
client.commands.set('challenge', {
  async execute(message, args) {
    const opponent = message.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!opponent || isNaN(amount)) return message.reply("Usage: `!challenge @user 100`");

    const challengeEmbed = createChallenge(message, opponent.id, amount);

    const badge = crimeBadges.get(message.author.id);
    if (badge && badge.expires > Date.now()) {
      challengeEmbed.setFooter({ text: `${badge.icon} ${badge.badge}`, iconURL: message.author.displayAvatarURL() });
    }

    message.channel.send({ embeds: [challengeEmbed] });
  }
});

client.commands.set('accept', {
  async execute(message, args) {
    const challengerId = args[0];
    if (!challengerId) return message.reply("Usage: `!accept USER_ID`");

    const result = await acceptChallenge(client, message, challengerId);
    message.channel.send(result);
  }
});

client.commands.set('nbabet', {
  async execute(message, args) {
    console.log("✅ Running command: nbabet");
    console.log("[NBABET] Triggered by", message.author.username);

    try {
      const { getTodayGames } = require('./economy/nbaGames');
      const { buildRealTeamStats } = require('./economy/sportsPredict');
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

      const games = await getTodayGames();
      console.log(`[NBABET] Games fetched: ${games.length}`);
      if (!games.length) return message.reply("📭 No NBA games today.");

      const stats = buildRealTeamStats(games);
      console.log("[NBABET] Stats built");

      const gameId = args[0];
      const amount = parseInt(args[1]);
      console.log("[NBABET] User args:", { gameId, amount });

      if (!gameId || isNaN(amount) || amount <= 0) {
        console.warn("[NBABET] Invalid args:", args);
        return message.reply("Usage: `!nbabet <gameId> <amount>`");
      }

      const game = games.find((g, idx) => idx.toString() === gameId);
      if (!game) return message.reply("❌ Invalid game ID. Try `!nbagames` first.");

      const homeStats = stats[game.home];
      const visitorStats = stats[game.visitor];
      if (!homeStats || !visitorStats) return message.reply("⚠️ Missing stat data for this matchup.");

      const homePower = homeStats.powerScore;
      const visitorPower = visitorStats.powerScore;
      const total = homePower + visitorPower;
      const homeProb = homePower / total;
      const visitorProb = visitorPower / total;

      const homeOdds = (1 / homeProb).toFixed(2);
      const visitorOdds = (1 / visitorProb).toFixed(2);

      const predictedWinner = homePower > visitorPower ? game.home : game.visitor;

      const embed = new EmbedBuilder()
        .setTitle(`🏀 NBA Bet Slip: ${game.visitor} @ ${game.home}`)
        .setDescription(`**Predicted Winner:** ${predictedWinner}\nChoose a team to place your bet of $${amount.toLocaleString()}.`)
        .addFields(
          { name: `${game.visitor}`, value: `Power: ${visitorPower.toFixed(2)}\nWin%: ${(visitorProb * 100).toFixed(1)}%\n🧮 Odds: ${visitorOdds}x`, inline: true },
          { name: `${game.home}`, value: `Power: ${homePower.toFixed(2)}\nWin%: ${(homeProb * 100).toFixed(1)}%\n🧮 Odds: ${homeOdds}x`, inline: true }
        )
        .setFooter({ text: 'Dreamworld Sportsbook • Powered by Real Stats' })
        .setTimestamp()
        .setColor(predictedWinner === game.home ? '#00cc88' : '#3399ff');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`nbabet_A_${gameId}_${amount}`)
          .setLabel(`🏠 Bet on ${game.home}`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`nbabet_B_${gameId}_${amount}`)
          .setLabel(`🛫 Bet on ${game.visitor}`)
          .setStyle(ButtonStyle.Secondary)
      );

      await message.channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('❌ [NBABET ERROR]:', err);
      return message.reply("⚠️ Something went wrong placing your bet.");
    }
  }
});

client.commands.set('nbapredict', {
  async execute(message) {
    console.log("✅ Running command: nbapredict");
    console.log("[NBAPREDICT] Triggered by", message.author.username, `(${message.author.id})`);

    try {
      const { buildRealTeamStats } = require('./economy/sportsPredict');
      const { getTodayGames } = require('./economy/nbaGames');
      const { EmbedBuilder } = require('discord.js');

      const games = await getTodayGames();
      console.log(`[NBAPREDICT] Games fetched: ${games.length}`);
      if (!games.length) return message.reply("📭 No games to predict today.");

      const stats = buildRealTeamStats(games);
      console.log("[NBAPREDICT] Team stats keys:", Object.keys(stats));

      for (const game of games) {
        const { home, visitor } = game;
        const homeStats = stats[home];
        const awayStats = stats[visitor];

        console.log(`[NBAPREDICT] Analyzing game: ${visitor} @ ${home}`);

        if (!homeStats || !awayStats) {
          console.warn(`[NBAPREDICT] Missing stats for ${visitor} @ ${home}`);
          await message.channel.send(`⚠️ Missing data for **${visitor} @ ${home}**.`);
          continue;
        }

        const homeScore = homeStats.powerScore;
        const awayScore = awayStats.powerScore;
        const predicted = homeScore > awayScore ? home : visitor;
        const confidence = Math.abs(homeScore - awayScore).toFixed(2);

        const embed = new EmbedBuilder()
          .setTitle(`📊 NBA Prediction: ${visitor} @ ${home}`)
          .setDescription(`**Predicted Winner:** 🏆 **${predicted}**\n**Confidence Score:** ${confidence}`)
          .addFields(
            {
              name: `${home} Stats`,
              value: `Win%: ${(homeStats.winPct * 100).toFixed(1)}%\nPPG: ${homeStats.pointsPerGame.toFixed(1)}\nDiff: ${homeStats.pointDiff.toFixed(1)}\nPower: ${homeScore.toFixed(2)}`,
              inline: true
            },
            {
              name: `${visitor} Stats`,
              value: `Win%: ${(awayStats.winPct * 100).toFixed(1)}%\nPPG: ${awayStats.pointsPerGame.toFixed(1)}\nDiff: ${awayStats.pointDiff.toFixed(1)}\nPower: ${awayScore.toFixed(2)}`,
              inline: true
            }
          )
          .setFooter({ text: 'Dreamworld Sports Analytics' })
          .setColor(predicted === home ? '#32cd32' : '#1e90ff')
          .setTimestamp();

        await message.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('❌ [NBAPREDICT ERROR]:', err);
      return message.reply('⚠️ Something went wrong predicting games.');
    }
  }
});


client.commands.set('jackpot', {
  async execute(message) {
    const amount = getJackpotAmount();
    const last = getLastWinner();
    message.channel.send(`🎰 Current Jackpot: **${amount} DreamTokens**\nLast Winner: <@${last ?? 'Nobody yet'}>`);
  }
});

// Run every 3 minutes
setInterval(() => {
  resolveFinishedGames(client);
}, 3 * 60 * 1000);

client.commands.set('submitmusic', {
  execute(message) {
    if (message.channel.name !== 'art-submission') {
      return message.reply("🎶 Music submissions are only accepted in #art-submission.");
    }

    message.channel.send(`🎧 Want to submit your track to the playlist?

💸 Submit Fee: $5
Every submission gets reviewed and may be featured.

🔗 Pay Here:
Stripe: https://buy.stripe.com/test_fZebLRg6Gh0GgdWfZ6 
PayPal: https://www.paypal.com/ncp/payment/UT4BMB4AG4ABA

Once paid, use:
!mysubmission <your link or description>
`);
  }
});

client.commands.set('mysubmission', {
  async execute(message, args) {
    if (message.channel.name !== 'art-submission') {
      return message.reply("🚫 Music submissions only allowed in #art-submission.");
    }

    const userId = message.author.id;
    const guildId = message.guild.id;
    const link = args.join(' ');

    if (!link || !link.includes('http')) {
      return message.reply("Please include a valid link or description of your submission.");
    }

    const hasPaid = await hasPaidForSubmission(userId, guildId);
    if (!hasPaid) {
      return message.reply("💸 Please complete your payment before submitting. Use `!submitmusic` to get started.");
    }

    message.reply("✅ Submission received. Our curators will check it out!");
    message.guild.channels.cache.find(c => c.name === 'art-submission')
      .send(`🎶 **New Submission by <@${userId}>:**\n${link}`);

    // Optional: tag them as artist
    const role = message.guild.roles.cache.find(r => r.name === 'Submitted Artist');
    if (role) message.member.roles.add(role);
  }
});

client.on('messageCreate', async (message) => {
  if (
    message.channel.name === 'art-submission' &&
    (message.content.includes('youtube.com') || message.content.includes('soundcloud.com'))
  ) {
    const paid = await hasPaidForSubmission(message.author.id, message.guild.id);
    if (!paid) {
      message.delete();
      message.author.send('You must pay before submitting music.');
    }
  }
});

client.on('interactionCreate', async interaction => {
  
  try {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    const { customId, user, message } = interaction;
    const userId = user.id;

    // NBA BETTING BTTONS
    if (interaction.isButton() && interaction.customId.startsWith('nbabet_')) {
      const [_, teamLetter, gameId, amount] = interaction.customId.split('_');
      const { placeBet } = require('./economy/betting');
      const betId = `nba-${gameId}`;
    
      try {
        await placeBet(interaction, betId, teamLetter, parseInt(amount));
      } catch (err) {
        console.error('❌ NBA Bet Button Error:', err);
        await interaction.reply({ content: '⚠️ Failed to place bet. Try again later.', ephemeral: true });
      }
    
      return; // ✅ Prevents fallthrough
    }
    
// Hide out
    if (interaction.isButton() && interaction.customId.startsWith('extend_hideout_') || interaction.customId.startsWith('leave_hideout_')) {
      const [action, type, targetId] = interaction.customId.split('_'); // extend_hideout_USERID or leave_hideout_USERID
      const userId = interaction.user.id;
    
      if (targetId !== userId) {
        return interaction.reply({ content: "❌ This isn't your button to press.", ephemeral: true });
      }
    
      const now = Date.now();
      const { getBalance, removeCash } = require('./economy/currency');
      const protectionCost = 2500;
      const paidDuration = 60 * 60 * 1000; // 1 hour
    
      if (action === 'extend') {
        const balance = await getBalance(userId, interaction.guild.id);
        if (balance < protectionCost) {
          return interaction.reply({ content: `💸 You need $${protectionCost} to extend your hideout.`, ephemeral: true });
        }
    
        await removeCash(userId, interaction.guild.id, protectionCost);
        const current = hideoutMap.get(userId) || now;
        hideoutMap.set(userId, current + paidDuration);
    
        return interaction.reply({ content: `⏳ Hideout extended by 1 hour.`, ephemeral: true });
      }
    
      if (action === 'leave') {
        hideoutMap.set(userId, 0);
        return interaction.reply({ content: `🚪 You left the hideout. Real player attacks enabled again.`, ephemeral: true });
      }
    }
    

    // Use Item
    if (interaction.isButton() && interaction.customId.startsWith('use_item_')) {
      const parts = interaction.customId.split('_'); // use_item_medal_2
      const itemId = parts[2];
      const amount = parseInt(parts[3]) || 1;
    
      // Create a fake message object to reuse existing !use logic
      const fakeMessage = {
        author: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel,
        reply: (msg) => interaction.reply({ content: msg, ephemeral: true })
      };
    
      const useCommand = client.commands.get('use');
      if (useCommand) {
        try {
          await useCommand.execute(fakeMessage, [itemId, amount]);
        } catch (err) {
          console.error('❌ Error handling item use button:', err);
          await interaction.reply({ content: "Something went wrong using the item.", ephemeral: true });
        }
      }
    }
    

// 🕵️ Handle Snitch Sell Button
if (interaction.isButton() && interaction.customId.startsWith('snitch_sell_')) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const parts = interaction.customId.split('_');
    const userId = parts[2];
    const drugId = parts[3];
    const quantity = parseInt(parts[4]);

    if (interaction.user.id !== userId) {
      return interaction.editReply({ content: "❌ This deal ain't for you." });
    }

    const activeSnitch = interaction.client.activeSnitches?.get(interaction.message.id);
    if (!activeSnitch || activeSnitch.drug !== drugId) {
      return interaction.editReply({ content: `❌ The snitch isn't available anymore.` });
    }

    const inventory = activeSnitch.inventory;
    let playerQty = 0;

    if (inventory instanceof Map) {
      playerQty = inventory.get(drugId) || 0;
    } else {
      playerQty = inventory[drugId] || 0;
    }

    console.log(`[SNITCH SELL DEBUG] DrugId: ${drugId}, Needed: ${quantity}, PlayerQty: ${playerQty}`);

    if (playerQty < quantity) {
      return interaction.editReply({ content: `❌ You need ${quantity}x ${drugId.toUpperCase()} to sell, but you only have ${playerQty}.` });
    }

    const { addCash, removeCash } = require('./economy/currency');
    const { removeItem } = require('./economy/inventory');

    if (activeSnitch.fake) {
      // ❗ Fake snitch = steal cash instead!
      const lossAmount = Math.floor(Math.random() * 1500) + 500;
      await removeCash(userId, interaction.guildId, lossAmount);

      await interaction.editReply({
        content: `💀 You fell for a **FAKE SNITCH**! They stole **$${lossAmount}** from your stash and vanished.`
      });

    } else {
      const { drugs } = require('./utils/drugList');
      const drug = drugs.find(d => d.id === drugId);
      const basePrice = drug?.base || 500; // fallback to $500 if missing
      const payout = Math.floor(basePrice * quantity * activeSnitch.bonus);

      await removeItem(userId, interaction.guildId, drugId, quantity);
      await addCash(userId, interaction.guildId, payout);

      await interaction.editReply({
        content: `🕵️ You sold **${quantity}x ${drugId.toUpperCase()}** for **$${payout}** (${Math.floor(activeSnitch.bonus * 100)}% value)!`
      });
    }

    // Cleanup
    const msg = await interaction.channel.messages.fetch(interaction.message.id).catch(() => null);
    if (msg) await msg.delete().catch(() => {});
    interaction.client.activeSnitches.delete(interaction.message.id);

  } catch (err) {
    console.error("[SNITCH BUTTON ERROR]", err);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ Something went wrong selling to the Snitch.", ephemeral: true });
    }
  }
}

// 🔁 Gang Viewer Pagination Buttons
if (interaction.isButton() && interaction.customId.startsWith('gang_')) {
  const [_, direction, oldIndexStr] = interaction.customId.split('_');
  let index = parseInt(oldIndexStr);

  // ✅ Import from module once, cleanly
  const { gangs, getGangMembers, buildGangEmbed } = require('./commands/gangs');
  const gangArray = Object.entries(gangs);

  // 🔄 Calculate new index
  index = direction === 'next'
    ? (index + 1) % gangArray.length
    : (index - 1 + gangArray.length) % gangArray.length;

  const [gangId, gang] = gangArray[index];
  const members = await getGangMembers(gangId, interaction.guildId);
  const embed = buildGangEmbed(gangId, gang, members, index);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`gang_prev_${index}`)
      .setLabel('⬅️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`gang_next_${index}`)
      .setLabel('➡️')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}



// 📦 Handle Bulk Buyer Sell Button
if (interaction.customId.startsWith('bulk_sell_')) {


  const [_, sellerId, drugId, quantityNeeded] = interaction.customId.split('_');
  const quantity = parseInt(quantityNeeded);

  if (interaction.user.id !== sellerId) {
    return interaction.reply({ content: "❌ This deal isn't for you.", ephemeral: true });
  }

  const inventory = await getInventory(sellerId, interaction.guildId);
  const availableQty = inventory[drugId] || 0;

  if (availableQty < quantity) {
    return interaction.reply({ content: `❌ You don't have enough **${drugId}** to complete the sale!`, ephemeral: true });
  }

  const buyer = activeBulkBuyers.get(interaction.message.id);
  if (!buyer) {
    return interaction.reply({ content: "❌ This buyer is no longer available.", ephemeral: true });
  }

  await removeItem(sellerId, interaction.guildId, drugId, quantity);
  await addCash(sellerId, interaction.guildId, buyer.payout);

  activeBulkBuyers.delete(interaction.message.id);
  await interaction.update({ content: `✅ You sold **${quantity}x ${drugId.toUpperCase()}** for **$${buyer.payout.toLocaleString()}**!`, embeds: [], components: [] });
}

// 🧥 Handle Fashion Store Purchases
if (interaction.isButton() && interaction.customId.startsWith('buy_fashion_')) {
  const { getFashionDrop } = require('./economy/fashionShop');
  const { getBalance, removeCash } = require('./economy/currency');
  const { Inventory } = require('./economy/inventory');
  const FashionModel = require('./models/FashionModel');
  const { EmbedBuilder } = require('discord.js');

  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const customId = interaction.customId;

  console.log(`🧥 [FashionButton] ${userId} clicked ${customId}`);

  const itemId = customId.replace('buy_fashion_', '');
  const drop = getFashionDrop();
  const item = drop.find(i => i.id === itemId);

  if (!item) {
    console.warn(`❌ [FashionButton] Item ${itemId} not found in current drop.`);
    return interaction.reply({ content: '⚠️ This item is no longer in stock.', ephemeral: true });
  }

  const balance = await getBalance(userId, guildId);
  if (balance < item.price) {
    console.log(`💸 [FashionButton] Insufficient funds: user has $${balance}, item costs $${item.price}`);
    return interaction.reply({ content: `❌ You need $${item.price} DreamworldPoints to buy this.`, ephemeral: true });
  }

  await removeCash(userId, guildId, item.price);
  console.log(`💰 [FashionButton] Deducted $${item.price} from user ${userId}`);

  let inv = await Inventory.findOne({ userId, guildId });
  if (!inv) inv = await Inventory.create({ userId, guildId });
  inv.items.set(item.id, (inv.items.get(item.id) || 0) + 1);
  await inv.save();

  const newItem = new FashionModel({
    userId,
    guildId,
    itemId: item.id,
    name: item.name,
    brand: item.brand,
    price: item.price,
    image: item.image,
    tryOnUrl: item.tryOnUrl,
    statBuff: item.statBuff,
    purchasedAt: new Date()
  });

  await newItem.save();
  console.log(`✅ [FashionButton] ${interaction.user.username} bought ${item.name} for $${item.price}`);

  const embed = new EmbedBuilder()
    .setTitle(`🧥 ${item.name} Acquired!`)
    .setDescription(`Brand: **${item.brand}**\nPrice: $${item.price}\nBuff: ${item.statBuff}`)
    .setImage(item.image)
    .setColor('#ffaaff');

  await interaction.reply({ embeds: [embed], ephemeral: true });
}


// 🏃 Handle Robbery Flee Button
if (interaction.isButton() && interaction.customId.startsWith('npc_flee_')) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const { getStat } = require('./statUtils');
    const { removeCash } = require('./economy/currency');

    const userId = interaction.customId.split('_')[2];

    if (interaction.user.id !== userId) {
      return interaction.editReply({ content: "❌ This isn't your robbery!", ephemeral: true });
    }

    const agility = await getStat(userId, interaction.guildId, 'agility') || 0;

    // Calculate flee chance
    let fleeChance = Math.min(0.10 + agility * 0.02, 0.8); // 10% base + 2% per agility point, max 80%

    console.log(`[FLEE ATTEMPT] User: ${userId} | Agility: ${agility} | Chance: ${Math.round(fleeChance * 100)}%`);

    if (Math.random() < fleeChance) {
      const successEmbed = new EmbedBuilder()
        .setTitle('🏃 You Escaped!')
        .setDescription(`Your agility helped you outrun the robber!`)
        .setColor('#33cc33');
      return await interaction.editReply({ embeds: [successEmbed], components: [] });
    } else {
      const mood = getRandomMood();
      let baseLoot = Math.floor(Math.random() * 300) + 100;
      const finalLoot = calculateLoot(baseLoot, mood);

      await removeCash(userId, interaction.guildId, finalLoot);

      let moodEmoji = mood === "confident" ? "😎" : mood === "scared" ? "😨" : "😐";

      const failEmbed = new EmbedBuilder()
        .setTitle('💀 Failed to Escape!')
        .setDescription(`The robber was **${mood}** ${moodEmoji}, and you lost **$${finalLoot}**.`)
        .setColor('#aa0000');

      return await interaction.editReply({ embeds: [failEmbed], components: [] });
    }
  } catch (err) {
    console.error("[NPC FLEE BUTTON ERROR]", err);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ Something went wrong during the escape.", ephemeral: true });
    }
  }
}
    
    // 🐕 Feed Buttons
    if (interaction.isButton() && interaction.customId.startsWith('feed_')) {
      const itemId = interaction.customId.split('feed_')[1];
      const { execute } = require('./commands/feeddog');
      await execute(interaction, [itemId], true); // 👈 tell feeddog to refresh dog profile after
    }
    
    
// 🐕 Handle adopting stray dogs
if (interaction.isButton() && interaction.customId.startsWith('adopt_stray_')) {
  const dogId = interaction.customId.split('_')[2];
  const strayInfo = strayDogs.get(dogId);
  if (!strayInfo) {
    return interaction.reply({ content: "❌ This stray dog is no longer available.", ephemeral: true });
  }

  if (interaction.user.id === strayInfo.ownerId) {
    return interaction.reply({ content: "❌ You can't adopt your own stray. Use Recover.", ephemeral: true });
  }

  const dog = strayInfo.dog;
  dog.userId = interaction.user.id;
  await dog.save();

  clearTimeout(strayInfo.timeout);
  strayDogs.delete(dogId);

  await interaction.update({
    content: `🐾 <@${interaction.user.id}> adopted **${dog.name}**!`,
    embeds: [],
    components: []
  });
}

// 🐕 Handle recovering own stray dog
if (interaction.isButton() && interaction.customId.startsWith('recover_stray_')) {
  const dogId = interaction.customId.split('_')[2];
  const strayInfo = strayDogs.get(dogId);
  if (!strayInfo) {
    return interaction.reply({ content: "❌ This stray dog is no longer available.", ephemeral: true });
  }

  if (interaction.user.id !== strayInfo.ownerId) {
    return interaction.reply({ content: "❌ Only the original owner can recover this dog.", ephemeral: true });
  }

  clearTimeout(strayInfo.timeout);
  strayDogs.delete(dogId);

  const dog = strayInfo.dog;
  dog.userId = interaction.user.id;
  await dog.save();

  await interaction.update({
    content: `❤️ <@${interaction.user.id}> recovered their dog **${dog.name}**!`,
    embeds: [],
    components: []
  });
}


    // 🐕 Handle Dog Purchase Buttons in interactionCreate.js
    if (interaction.isButton() && interaction.customId.startsWith('buydog_')) {
      const breedId = interaction.customId.split('_')[1];
      const DOGS = {
        pitbull: { name: 'Pitbull', cost: 10000, hp: 100, level: 1, mood: 'Happy', cooldown: 0 },
        shepherd: { name: 'Shepherd', cost: 15000, hp: 100, level: 1, mood: 'Happy', cooldown: 0 },
        pomeranian: { name: 'Pomeranian', cost: 25000, hp: 100, level: 1, mood: 'Happy', cooldown: 0 }
      };
    
      const dog = DOGS[breedId];
      if (!dog) return interaction.reply({ content: '❌ Unknown dog breed.', ephemeral: true });
    
      const userId = interaction.user.id;
      const guildId = interaction.guildId;
      const balance = await getBalance(userId, guildId);
    
      console.log(`🐶 Dog Purchase Triggered`);
      console.log(`➡️ Chosen Breed: ${breedId}`);
      console.log(`💰 User balance: $${balance}, Dog cost: $${dog.cost}`);
    
      if (balance < dog.cost) {
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({ content: "❌ You can't afford this dog.", ephemeral: true });
        }
        return;
      }
    
      await removeCash(userId, guildId, dog.cost);
      await setDog(userId, guildId, { ...dog, breed: breedId });
      console.log(`✅ Dog saved to DB for: ${userId}`);
    
      return interaction.reply({ content: `✅ You adopted a loyal ${dog.name}! They'll defend you from player attacks.`, ephemeral: true });
    }
    

    if (interaction.isButton() && customId.startsWith('grab_money_')) {
      return dropCommand.handleButton(interaction);
    }

// shopping for inventory items
if (interaction.isButton() && interaction.customId.startsWith('buy_item_')) {
  const itemId = interaction.customId.replace('buy_item_', ''); // ✅ FULL replacement

  const { getBalance, removeCash } = require('./economy/currency');
  const { addItem } = require('./economy/inventory');

  const item = rotatingShop.find(i => i.id === itemId); // ✅ This will now correctly match
  if (!item) {
    console.log(`[SHOP DEBUG] Item ID not found: ${itemId}`);
    return interaction.reply({ content: '❌ Item not found or not in shop anymore.', ephemeral: true });
  }

  if (item.stock <= 0) {
    return interaction.reply({ content: '❌ This item is sold out!', ephemeral: true });
  }

  const price = item.price;
  const balance = await getBalance(interaction.user.id, interaction.guildId);

  if (balance < price) {
    return interaction.reply({ content: "❌ You don't have enough cash.", ephemeral: true });
  }

  item.stock--; // ✅ Reduce live stock immediately

  await removeCash(interaction.user.id, interaction.guildId, price);
  await addItem(interaction.user.id, interaction.guildId, itemId, 1);

  const embed = new EmbedBuilder()
    .setTitle('🛒 Item Purchased!')
    .setDescription(`You bought **${item.name}** for **$${price}**.`)
    .setColor('#33cc33');

  await interaction.reply({ embeds: [embed], ephemeral: true });
  updateShopEmbed();
}

    
// 🧥 Fence Dealer Handler (multi-item, level scaling)
if (customId.startsWith('fence_sell_')) {
  const [_, itemId, value, targetId, quantityRaw] = customId.split('_');
  const sellQty = parseInt(quantityRaw, 10) || 1;

  if (user.id !== targetId) {
    return interaction.reply({ content: "❌ This deal isn't for you.", ephemeral: true });
  }

  const { removeItem } = require('../economy/inventory');
  const { addCash } = require('../economy/currency');
  const Levels = require('../economy/xpRewards');

  const inventory = await getInventory(user.id, interaction.guildId);
  const currentQty = inventory?.get(itemId) || 0;

  if (currentQty < sellQty) {
    return interaction.reply({ content: `❌ You need ${sellQty}x ${itemId}, but only have ${currentQty}.`, ephemeral: true });
  }

  const success = await removeItem(user.id, interaction.guildId, itemId, sellQty);
  if (!success) {
    return interaction.reply({ content: "❌ Item could not be removed from your inventory.", ephemeral: true });
  }

  const levelData = await Levels.fetch(user.id, interaction.guildId);
  const level = levelData?.level || 1;
  const bonusMultiplier = 1 + level * 0.05;
  const dynamicValue = Math.floor(parseInt(value) * bonusMultiplier);

  await addCash(user.id, interaction.guildId, dynamicValue);

  const confirm = new EmbedBuilder()
    .setTitle("💼 Deal Made")
    .setDescription(`You sold **${sellQty}x ${itemId}** for **$${dynamicValue.toLocaleString()}** to the Fence.\n📈 (Level ${level} Bonus Applied)`)
    .setColor('#66cc66')
    .setTimestamp();

  return interaction.reply({ embeds: [confirm], ephemeral: true });
}


// 🚚 Mule Interaction
if (customId.startsWith('mule_accept_')) {
  console.log('[MULE BUTTON] Triggered mule_accept:', customId);
  const [_, __, muleUserId, drug] = customId.split('_');
  console.log('[MULE BUTTON] Parsed:', { muleUserId, drug });

  if (user.id !== muleUserId) {
    console.warn('[MULE BUTTON] Unauthorized user interaction:', user.id);
    return interaction.reply({ content: "❌ This ain't your mule!", ephemeral: true });
  }

  try {
    const { getInventory, saveInventory } = require('../economy/inventory');
    const { addCash } = require('../economy/currency');
    const { adjustReputation } = require('../events/npc/npcReputation');
    const { deliveryLoyalty } = require('../events/npc/npcMules');

    const stash = await getInventory(user.id, interaction.guildId);
    console.log('[MULE BUTTON] Fetched inventory:', stash);
    const qty = stash[drug]?.qty || 0;
    console.log(`[MULE BUTTON] Quantity of ${drug}:`, qty);

    if (qty <= 0) {
      console.warn('[MULE BUTTON] No stash left to deliver.');
      return interaction.reply({ content: "📦 Your stash is already gone.", ephemeral: true });
    }

    const bust = Math.random() < 0.1;
    console.log(`[MULE BUTTON] Busted:`, bust);

    if (bust) {
      stash[drug].qty = 0;
      await saveInventory(user.id, interaction.guildId, stash);
      console.warn(`[MULE BUTTON] Mule busted with ${qty}x ${drug}. Stash wiped.`);
      return interaction.reply({ content: `🚨 The mule got caught at the border. You lost all your **${drug}**.`, ephemeral: true });
    }

    const delivered = Math.floor(qty * 0.95);
    stash[drug].qty = 0;
    await saveInventory(user.id, interaction.guildId, stash);
    await addCash(user.id, interaction.guildId, delivered * 100);

    const loyalty = (deliveryLoyalty.get(user.id) || 0) + 1;
    deliveryLoyalty.set(user.id, loyalty);
    adjustReputation(user.id, 'Mule', +1);

    console.log(`[MULE BUTTON] Delivery success:`, {
      delivered,
      cash: delivered * 100,
      loyalty
    });

    return interaction.reply({
      content: `✅ Mule delivered your **${qty}x ${drug}** stash safely.\n💰 You received **$${delivered * 100}** (5% cut).\n🐫 Mule Loyalty: ${loyalty}`,
      ephemeral: true
    });
  } catch (e) {
    console.error('[MULE BUTTON ERROR]', e);
    return interaction.reply({ content: "❌ Something went wrong with the mule delivery.", ephemeral: true });
  }
}

if (customId.startsWith('mule_decline_')) {
  console.log('[MULE BUTTON] Declined mule offer');
  return interaction.reply({ content: "🚫 You kept your stash hidden. No risks taken.", ephemeral: true });
}

if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const activeTables = new Map(); // tableId => { players: [userId], gameState }
  const cardDeck = [
    "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"
  ];
  
  const suits = ["c", "d", "h", "s"];

// prison + gang logic
if (customId.startsWith('steal_')) {
  const targetId = customId.split('_')[1];

    // ✅ Make sure this whole block is async (which it is if it's inside interactionCreate)
    const blockedByDog = await tryDogDefense(targetId, interaction.guildId);
    if (blockedByDog) {
      await updateDogAfterDefense(targetId, interaction.guildId);
      return interaction.reply({
        content: '🐕 A guard dog lunged at you! You ran off empty-handed.',
        ephemeral: true
      });
    }

  // Prevent robbing yourself (this might happen via button)
  if (user.id === targetId) {
    return interaction.reply({ content: "❌ You can't rob yourself.", ephemeral: true });
  }

  const targetUser = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!targetUser) {
    return interaction.reply({ content: '❌ Could not find target user.', ephemeral: true });
  }

  // Create fake message to reuse the same command logic
  const fakeMessage = {
    author: user,
    guild: interaction.guild,
    channel: interaction.channel,
    mentions: {
      users: {
        first: () => targetUser.user
      }
    },
    reply: (content) => {
      if (typeof content === 'string') {
        return interaction.channel.send({ content });
      } else {
        return interaction.channel.send(content); // allow embeds, buttons, etc
      }
    }
  };

  const stealCommand = client.commands.get('steal');
  if (stealCommand) {
    try {
      await stealCommand.execute(fakeMessage);
      await interaction.deferUpdate(); // hides button animation
    } catch (err) {
      console.error('Error running steal command from button:', err);
      await interaction.reply({ content: "❌ Something went wrong during the heist.", ephemeral: true });
    }
  }

  return; // ✅ CRUCIAL: prevents fall-through / duplication
}

  
  function createDeck() {
    const deck = [];
    for (const val of cardDeck) {
      for (const suit of suits) {
        const isRed = suit === "d" || suit === "h";
        deck.push({
          name: `${val}_${suit}_${isRed ? "r" : "b"}`,
          value: val,
          suit
        });
      }
    }
    return deck.sort(() => Math.random() - 0.5);
  }
  
  function calculateHandValue(cards) {
    let value = 0;
    let aces = 0;
    for (const card of cards) {
      if (["jack", "queen", "king"].includes(card.value)) value += 10;
      else if (card.value === "ace") {
        aces++;
        value += 11;
      } else {
        value += parseInt(card.value);
      }
    }
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }
    return value;
  }
  
  module.exports = {
    name: "blackjack",
    async execute(message) {
      const userId = message.author.id;
      const betAmount = 100; // Default for now
      const balance = await getBalance(userId, message.guild.id);
  
      if (balance < betAmount) {
        return message.reply("❌ Not enough funds to join blackjack table.");
      }
  
      await removeCash(userId, message.guild.id, betAmount);
  
      // Assign table
      let table = [...activeTables.values()].find(t => t.players.length < 8);
      if (!table) {
        const tableId = `table_${Date.now()}`;
        table = {
          id: tableId,
          deck: createDeck(),
          players: [],
          hands: {},
          dealerHand: [],
          status: "waiting"
        };
        activeTables.set(tableId, table);
      }
  
      table.players.push(userId);
      table.hands[userId] = [table.deck.pop(), table.deck.pop()];
  
      if (table.players.length === 8) {
        table.dealerHand = [table.deck.pop(), table.deck.pop()];
        table.status = "in-progress";
      }
  
      const hand = table.hands[userId];
      const handValue = calculateHandValue(hand);
  
      const embed = new EmbedBuilder()
        .setTitle(`🃏 Blackjack Table (${table.players.length}/8)`)
        .setDescription(`Your hand: ${hand.map(c => c.name).join(", ")}
  Value: ${handValue}`)
        .setColor("#ffaa00");
  
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`hit_${table.id}_${userId}`).setLabel("🂠 Hit").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`hold_${table.id}_${userId}`).setLabel("✋ Hold").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`leave_${table.id}_${userId}`).setLabel("🚪 Leave").setStyle(ButtonStyle.Danger)
      );
      return interaction.reply({ content: `<@${userId}>`, embeds: [embed], components: [row] });

    
      function cardEmoji(card) {
        const filename = card.replace('.png', '').replace(/_/g, '');
        return `[:${filename}:](https://github.com/martymods/discord-community-bot/tree/main/public/sharedphotos/${card})`; // Replace domain
      }
      
      await message.channel.send({ content: `<@${userId}>`, embeds: [embed], components: [row] });
    }
  };
  
  if (customId.startsWith("hit_") || customId.startsWith("hold_") || customId.startsWith("leave_")) {
    const { handleButton } = require('./commands/blackjackCommand.js');
    return handleButton(interaction);
  }
  

  // ✅ Handle stat button interactions
  if (customId.startsWith('stat_')) {
    return await handleStatButton(interaction);
  }

  // 🎯 Handle Game Selection
  if (interaction.isStringSelectMenu() && customId.startsWith('gamble_select_')) {
    if (!customId.endsWith(userId)) {
      return interaction.reply({ content: "Not your menu.", ephemeral: true });
    }

    const game = interaction.values[0];

    if (game === "blackjack") {
      // Trigger the blackjack command instead
      const blackjackCommand = require('./commands/blackjackCommand');
      return blackjackCommand.execute(interaction);
    }
    
    const tiers = [10, 100, 1000, 10000, 100000];

    const row = new ActionRowBuilder().addComponents(
      tiers.map(t =>
        new ButtonBuilder()
          .setCustomId(`gamble_play_${game}_${t}_${userId}`)
          .setLabel(`$${t}`)
          .setStyle(ButtonStyle.Primary)
      )
    );
    
    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${game === "scratch" ? "Scratch Card" : "Street Dice"} Mode`)
      .setDescription("Pick your wager tier:")
      .setColor("#33cc33");
    
    return interaction.reply({ content: `<@${userId}>`, embeds: [embed], components: [row] });
    

    
  }

  // 💸 Handle Gamble Execution
  if (interaction.isButton() && customId.startsWith("gamble_play_")) {
    const parts = customId.split('_');
    const initiator = parts.pop();
    const tierRaw = parts.pop();
    const game = parts.slice(2).join('_');
    const tier = parseInt(tierRaw);
  
    if (initiator !== userId) {
      return interaction.reply({ content: "Not your button.", ephemeral: true });
    }
  
    const lastUse = cooldowns.get(userId);
    if (lastUse && Date.now() - lastUse < 5000) {
      return interaction.reply({ content: "🕒 Slow down a bit...", ephemeral: true });
    }
    cooldowns.set(userId, Date.now());
  
    const balance = await getBalance(userId, interaction.guildId);
    if (balance < tier) {
      return interaction.reply({ content: `💸 You need $${tier} to play.`, ephemeral: true });
    }
  
    await removeCash(userId, interaction.guildId, tier);
    await interaction.deferReply(); // ✅ Use deferReply instead of deferUpdate
  
    const suspense = await interaction.channel.send(`🌀 Rolling for <@${userId}>...`);
    await new Promise(r => setTimeout(r, 1500));
  
    const won = game === "scratch" ? Math.random() < 0.2 : Math.random() < 0.5;
    const winnings = won ? tier * (game === "scratch" ? 5 : 2) : 0;
    const xpPerTier = { 10: 2, 100: 10, 1000: 25, 10000: 75, 100000: 250 };
  
    const embed = new EmbedBuilder()
      .setTitle(won ? "🎉 You Won!" : "💀 You Lost")
      .setDescription(won
        ? `You won **$${winnings}** from a ${game === "scratch" ? "Scratch Card" : "Dice Roll"}`
        : `Better luck next time!`)
      .setColor(won ? "#00ff88" : "#ff3333")
      .setFooter({ text: `+${xpPerTier[tier]} XP` });
  
    try {
      await Levels.appendXp(userId, interaction.guildId, xpPerTier[tier]);
    } catch (err) {
      console.error("❌ XP Award Failed:", err.message);
    }
  
    if (won) await addCash(userId, interaction.guildId, winnings);
  
    const rematchRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rematch_${game}_${tier}_${userId}`)
        .setLabel("🎰 Rematch Same Bet")
        .setStyle(ButtonStyle.Secondary)
    );
  
    return await interaction.editReply({
      content: `<@${userId}>`,
      embeds: [embed],
      components: [rematchRow]
    });
  }
  


  
// 🗡️ Handle Attack Logic
if (customId.startsWith('attack_')) {
  const [_, targetId, attackerId] = customId.split('_');
  if (user.id !== attackerId) {
    return interaction.reply({ content: "❌ You can't click someone else's attack button!", ephemeral: true });
  }

  const { reduceHP, getHP, handleDeath, isDead } = require('./economy/deathSystem');
  const { getInventory } = require('./economy/inventory');

  const newHP = reduceHP(targetId, interaction.guildId, 10); // Base attack

  // 🧠 Handle Death Logic
  if (newHP <= 0 && isDead(targetId, interaction.guildId)) {
    const inventory = await getInventory(targetId, interaction.guildId);
    const victimMember = interaction.guild.members.cache.get(targetId);

    if (victimMember) {
      await handleDeath(
        victimMember.user,
        interaction.guild,
        inventory,
        interaction.channel
      );

      // ✨ XP Gain Calculation
      const killerXP = await Levels.fetch(user.id, interaction.guildId);
      const victimXP = await Levels.fetch(targetId, interaction.guildId);
      const killerLevel = killerXP?.level || 1;
      const victimLevel = victimXP?.level || 1;
      const levelDiff = Math.max(0, victimLevel - killerLevel);
      const xpGain = 150 + levelDiff * 10;

      await Levels.appendXp(user.id, interaction.guildId, xpGain);

      // 📢 Global Alert
      const alertEmbed = new EmbedBuilder()
        .setTitle(`☠️ ${victimMember.user.username} Was Slain!`)
        .setDescription(`Their loot is up for grabs...\nDrop expires in **10 minutes**.`)
        .setThumbnail(victimMember.user.displayAvatarURL())
        .setImage('https://example.com/lootdrop.png') // Replace with real drop image
        .setColor('#880000')
        .setFooter({ text: `Killed by ${user.username}` });

      interaction.channel.send({ embeds: [alertEmbed] });

      // 👑 Praise Killer
      const praiseEmbed = new EmbedBuilder()
        .setTitle(`🎯 You Took Down ${victimMember.user.username}`)
        .setDescription(`You gained **${xpGain} XP** for slaying a level ${victimLevel} target.`)
        .setColor('#ffaa00')
        .setThumbnail(victimMember.user.displayAvatarURL());

      await interaction.followUp({ embeds: [praiseEmbed], ephemeral: true });

      // ☠️ Bonus line
      await interaction.followUp({
        content: `☠️ You **killed** <@${targetId}>! Their loot is now on the ground.`,
        ephemeral: true
      });
    }
  }

  // ❤️ HP Bar Feedback (always shown after attack)
  const current = getHP(targetId, interaction.guildId);
  const total = current.maxHP;
  const hp = current.hp;
  const barLength = 20;
  const filled = Math.round((hp / total) * barLength);
  const hpVisual = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  const hpBar = `❤️ ${hp} / ${total}\n${hpVisual}`;

  return await interaction.reply({
    content: `🗡️ You attacked <@${targetId}>!\n${hpBar}`,
    ephemeral: true
  });
}

// Handle rematch !gamble
if (customId.startsWith("rematch_")) {
  const [, game, tierRaw, initiator] = customId.split("_");
  if (initiator !== userId) {
    return interaction.reply({ content: "Not your button.", ephemeral: true });
  }

  const tier = parseInt(tierRaw);
  return await handleRematch(interaction, game, tier, userId);
}

// 🎭 Crime Outcome Buttons
if (customId.startsWith('crime_risk_') || customId.startsWith('crime_safe_')) {
  const userId = customId.split('_')[2];
  if (user.id !== userId) {
    return interaction.reply({ content: "❌ This isn't your mission.", ephemeral: true });
  }

  const missionData = activeCrimeData.get(userId);
  if (!missionData) {
    return interaction.reply({ content: "⚠️ No active mission found.", ephemeral: true });
  }

  try {
    await resolveCrimeOutcome(customId, interaction, missionData);
    activeCrimeData.delete(userId);
  } catch (err) {
    console.error('Crime Resolution Error:', err);
    return interaction.reply({ content: "❌ Something went wrong resolving your mission.", ephemeral: true });
  }
}


  // Global state maps
  global.prisonRats = global.prisonRats || new Map();
  global.riotFails = global.riotFails || new Map();
  global.riotWins = global.riotWins || new Map();
  global.smuggleWins = global.smuggleWins || new Map();


  if (customId.startsWith('recruit_')) {
    const targetId = customId.split('_')[1];
    const gang = gangMap.get(user.id);
    if (!gang) {
      return interaction.reply({ content: "🚫 You must be in a gang to recruit!", ephemeral: true });
    }
    return interaction.channel.send(`🤝 <@${user.id}> wants <@${targetId}> to join **${gangs[gang].name}**! Type \`!joingang ${gang}\` to accept.`);
  }

  if (customId === 'prison_smuggle') {
    const chance = Math.random();
    if (chance < 0.3) {
      const release = prisonUsers.get(user.id) || Date.now();
      prisonUsers.set(user.id, release + 2 * 60 * 1000);
      return interaction.reply({ content: '🚨 Caught smuggling! Your release is delayed 2 mins.', ephemeral: true });
    } else {
      await addCash(user.id, interaction.guildId, 200);
      await Levels.appendXp(user.id, interaction.guildId, 15);
      global.smuggleWins.set(user.id, (global.smuggleWins.get(user.id) || 0) + 1);
      return interaction.reply({ content: '📦 You smuggled a pack for $200 DreamworldPoints (+15 XP). Risky business.', ephemeral: true });
    }
  }

  if (customId === 'prison_rat') {
    const randomNPC = npcNames[Math.floor(Math.random() * npcNames.length)];
    global.prisonRats.set(user.id, randomNPC);
    await addCash(user.id, interaction.guildId, 100);
    await Levels.appendXp(user.id, interaction.guildId, 10);
    return interaction.reply({ content: `🐀 You ratted out **${randomNPC}**. +$100 & +10 XP... but the yard is watching.`, ephemeral: true });
  }

  if (customId === 'prison_riot') {
    const result = Math.random();
    if (result < 0.3) {
      const release = prisonUsers.get(user.id) || Date.now();
      prisonUsers.set(user.id, release + 2 * 60 * 1000);
      global.riotFails.set(user.id, (global.riotFails.get(user.id) || 0) + 1);
      return interaction.reply({ content: '🔥 You sparked a riot... guards shut it down. No reward. +2 mins in.', ephemeral: true });
    } else {
      const reward = Math.floor(Math.random() * 250 + 100);
      await addCash(user.id, interaction.guildId, reward);
      await Levels.appendXp(user.id, interaction.guildId, 25 + Math.floor(Math.random() * 15));
      global.riotWins.set(user.id, (global.riotWins.get(user.id) || 0) + 1);
      return interaction.reply({ content: `🧨 You led chaos. Got $${reward} + XP. Prison shook.`, ephemeral: true });
    }
  }

// 🔥 NPC Buyer Sell Handler (FINAL FIXED + Mood Bonus Applied)
if (customId.startsWith('npc_sell_') || customId.startsWith('npc_dm_sell_')) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const parts = customId.split('_');
    const isDM = parts[1] === 'dm';
    const drugId = isDM ? parts[3].toLowerCase() : parts[2].toLowerCase();
    const buyerName = isDM ? parts[4] : null;

    const profile = await DealerProfile.findOne({ userId: user.id, guildId: interaction.guildId });
    if (!profile) return interaction.editReply({ content: "❌ You don’t have any profile. Use `!dealer` first." });

    const inv = profile.inventory instanceof Map
      ? Object.fromEntries(profile.inventory)
      : { ...profile.inventory };

    if (!inv[drugId] || inv[drugId] <= 0) {
      return interaction.editReply({ content: "❌ You don’t have enough to sell." });
    }

    const buyer = isDM
    ? [...activeBuyers.values()].find(b => b.name === buyerName && b.drug === drugId)
    : [...activeBuyers.values()].find(b => b.drug === drugId && b.name); // safer match
    console.log('[NPC SELL DEBUG]', {
      isDM,
      drugId,
      buyerName,
      foundBuyer: buyer,
      activeBuyers: [...activeBuyers.values()]
    });
    

    if (!buyer) return interaction.editReply({ content: "❌ That buyer is gone." });
    // ⛔ Check for mood block (Phase 9)
if (isBlocked(user.id, buyer.name)) {
  return interaction.editReply({
    content: `🚫 ${buyer.name} refuses to deal with you. Mood too low.`,
    ephemeral: true
  });
}
    if ((inv[drugId] || 0) < buyer.quantity) {
      return interaction.editReply({ content: `❌ You need ${buyer.quantity} ${drugId} to sell.` });
    }

    const prices = profile.prices instanceof Map
      ? profile.prices
      : new Map(Object.entries(profile.prices));
    const basePrice = prices.get(drugId) || 100;

    // 🌡️ Apply Mood Modifier (Phase 8)
    const mood = getMood(user.id, buyer.name);
    const moodEffect = getMoodEffect(mood);
    const moodAdjustedPayout = Math.floor(basePrice * buyer.bonus * buyer.quantity * moodEffect);

    await addCash(user.id, interaction.guildId, moodAdjustedPayout);
    inv[drugId] -= buyer.quantity;
    profile.inventory = inv;
    profile.stashUsed -= buyer.quantity;
    profile.markModified('inventory');
    await profile.save();

    recordSale(interaction.client, user, buyer);
    adjustReputation(user.id, buyer.name, 1);

    const repRank = getReputationRank(getReputation(user.id, buyer.name));
    if (repRank === '💎 Trusted Plug') {
      const bonusCash = Math.floor(moodAdjustedPayout * 0.2);
      await addCash(user.id, interaction.guildId, bonusCash);
      interaction.followUp({
        content: `💎 Bonus $${bonusCash} for being a **Trusted Plug** with ${buyer.name}!`,
        ephemeral: true
      });
    }

    if (!isDM) {
      activeBuyers.delete(drugId);
    } else {
      cancelPrivateWindow(user.id, buyer.name);
    }

    await interaction.editReply({
      content: `💸 Sold ${buyer.quantity}x ${drugId.toUpperCase()} to **${buyer.name}** for **$${moodAdjustedPayout}**`
    });

    await maybeSpawnMule(interaction.client, user.id, interaction.guildId, interaction.channel);

    if (!isDM && shouldDM(user.id, buyer)) {
      await spawnPrivateBuyer(interaction.client, user, buyer);
    }

  } catch (err) {
    console.error('❌ NPC Sell Error:', err);
    if (!interaction.replied) {
      interaction.reply({ content: '❌ Something went wrong selling to this buyer.', ephemeral: true });
    }
  }
}

 // 💊 BULK SELL
if (interaction.isButton() && customId.startsWith('bulk_sell_')) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const parts = customId.split('_');
    const userId = parts[2];
    const drugId = parts[3];
    const quantity = parseInt(parts[4], 10);

    const buyer = activeBulkBuyers.get(interaction.message.id);
    if (!buyer) {
      return interaction.editReply({ content: "❌ Buyer already left." });
    }

    const profile = await DealerProfile.findOne({ userId, guildId: interaction.guildId });
    if (!profile) return interaction.editReply({ content: "❌ No profile found." });

    const inv = profile.inventory instanceof Map ? Object.fromEntries(profile.inventory) : { ...profile.inventory };

    if (!inv[drugId] || inv[drugId] < quantity) {
      return interaction.editReply({ content: `❌ You need ${quantity} ${drugId} to sell.` });
    }

    await addCash(userId, interaction.guildId, buyer.payout);
    inv[drugId] -= quantity;
    profile.inventory = inv;
    profile.stashUsed -= quantity;
    profile.markModified('inventory');
    await profile.save();

    activeBulkBuyers.delete(interaction.message.id);

    await interaction.editReply({
      content: `💸 Sold ${quantity}x ${drugId.toUpperCase()} for **$${buyer.payout.toLocaleString()}**`
    });

    const msg = await interaction.channel.messages.fetch(buyer.messageId).catch(() => null);
    if (msg) await msg.delete().catch(() => {});
    
  } catch (err) {
    if (err.code === 10062 || err.code === 40060) {
      console.warn('⏳ Ignored bulk buyer button — buyer already gone.');
      return;
    }
    console.error('❌ Error handling bulk buyer button:', err);
  }
}

  // 💊 DEALER SYSTEM HANDLER (FIXED)
  if (customId.startsWith('buy_drug_') || customId.startsWith('sell_drug_')) {
    const drugId = customId.split('_')[2];
    const drug = drugs.find(d => d.id === drugId);
    if (!drug) return interaction.reply({ content: '❌ Drug not found.', ephemeral: true });

    let profile = await DealerProfile.findOne({ userId: user.id, guildId: interaction.guildId });
    if (!profile) {
      return interaction.reply({ content: '❌ Use `!dealer` first to initialize your profile.', ephemeral: true });
    }

    const inv = profile.inventory instanceof Map ? Object.fromEntries(profile.inventory) : profile.inventory;
    for (const d of drugs) {
      if (typeof inv[d.id] !== 'number') inv[d.id] = 0;
    }

    profile.inventory = inv;
    profile.markModified('inventory');

    if (!(profile.prices instanceof Map)) {
      profile.prices = new Map(Object.entries(profile.prices));
    }

    const price = profile.prices.get(drugId);
    if (typeof price !== 'number') {
      return interaction.reply({ content: '❌ Price not found. Try `!dealer` again to refresh.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const now = Date.now();
    if (now < (profile.raidCooldown || 0)) {
      return interaction.editReply("🚨 You're laying low right now. Try again in a few seconds.");
    }

    if (customId.startsWith('buy_drug_')) {
      const balance = await getBalance(user.id, interaction.guildId);
      if (balance < price) return interaction.editReply("💸 You're too broke to buy.");
      if (profile.stashUsed >= profile.stashCap) return interaction.editReply("📦 Stash is full!");
    
      await removeCash(user.id, interaction.guildId, price);
    
      // ✅ Update inventory safely
      const inv = profile.inventory instanceof Map
        ? Object.fromEntries(profile.inventory)
        : { ...profile.inventory };
    
      inv[drugId] = (inv[drugId] || 0) + 1;
      profile.inventory = inv;
    
      profile.stashUsed += 1;
      profile.markModified('inventory');
    
      profile.prices = Object.fromEntries(profile.prices); // ensure prices saves cleanly
      await profile.save();
    
      // 🚨 RAID LOGIC (unchanged)
      const userXp = await Levels.fetch(user.id, interaction.guildId);
      const level = userXp?.level || 1;
      const raidChance = Math.max(0.15 - (level * 0.01), 0.04);
    
      if (Math.random() < raidChance) {
        profile.raidCooldown = Date.now() + 10000;
        const currentStrikes = raidStrikes.get(user.id) || 0;
        const newStrikes = currentStrikes + 1;
        raidStrikes.set(user.id, newStrikes);
    
        interaction.channel.send(`🚨 **POLICE RAID!** ${user.username} is ducking again. Strike ${newStrikes}/3`);
    
        const heat = heatMap.get(user.id) || { heat: 0, lastActivity: Date.now() };
        heat.heat += 2;
        heat.lastActivity = Date.now();
        heatMap.set(user.id, heat);
    
        if (heat.heat >= 10) {
          interaction.channel.send(`🔥 <@${user.id}> is moving heavy. The streets are watching.`);
        }
    
        if (newStrikes >= 3) {
          const releaseTime = Date.now() + 10 * 60 * 1000;
          prisonUsers.set(user.id, releaseTime);
          raidStrikes.set(user.id, 0);
          const currentBal = await getBalance(user.id, interaction.guildId);
          await removeCash(user.id, interaction.guildId, Math.floor(currentBal));
          prisonBalances.set(user.id, currentBal);
          const prisonChannel = interaction.guild.channels.cache.find(c => c.name === "prison");
          if (prisonChannel) {
            prisonChannel.send(`🔐 <@${user.id}> got caught and sent to prison.\nRelease: <t:${Math.floor(releaseTime / 1000)}:R> unless bail is paid.`);
          }
          return interaction.editReply("🚓 Busted! You're being sent to prison...");
        }
      }
    
      const updatedBal = await getBalance(user.id, interaction.guildId);
      const updatedEmbed = generateMarketEmbed(user, profile, updatedBal);
      const msg = await interaction.channel.messages.fetch(profile.lastMarketMessageId).catch(() => null);
      if (msg) await msg.edit({ embeds: [updatedEmbed] });
      
      await spawnBulkBuyer(interaction.client, user.id, interaction.guildId, interaction.channel);
      await maybeTriggerRobbery(interaction);      // 💥 Check for random robber attack
      return interaction.editReply(`🛒 Bought 1 ${drug.name} for $${price}`);
    }
    

    if (customId.startsWith('sell_drug_')) {
      const inv = profile.inventory instanceof Map
        ? Object.fromEntries(profile.inventory)
        : profile.inventory;
    
      if (!inv[drugId] || inv[drugId] <= 0) {
        return interaction.editReply("❌ You don't have any to sell.");
      }
    
      inv[drugId] -= 1;
      profile.inventory = inv;
      profile.stashUsed--;
    
      await addCash(user.id, interaction.guildId, price);
    
      profile.markModified('inventory');
      profile.prices = Object.fromEntries(profile.prices); // ensure savable
      await profile.save();
    
      const updatedBal = await getBalance(user.id, interaction.guildId);
      const updatedEmbed = generateMarketEmbed(user, profile, updatedBal);
      const msg = await interaction.channel.messages.fetch(profile.lastMarketMessageId).catch(() => null);
      if (msg) await msg.edit({ embeds: [updatedEmbed] });

      await spawnBulkBuyer(interaction.client, user.id, interaction.guildId, interaction.channel);
      // 🛡️ Fake a message object when calling maybeTriggerRobbery
      await maybeTriggerRobbery({
        author: user,
        guild: interaction.guild,
        channel: interaction.channel
      });
      
      return interaction.editReply(`💰 Sold 1 ${drug.name} for $${price}`);
    }
    
  }
// 🧠 Handle Robbery Fight Back Button
if (interaction.isButton() && interaction.customId.startsWith('npc_robbery_')) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const { removeCash } = require('./economy/currency');

    const userId = interaction.customId.split('_')[2]; // npc_robbery_USERID

    if (interaction.user.id !== userId) {
      return interaction.editReply({ content: "❌ This ambush isn't meant for you!", ephemeral: true });
    }

    const mood = getRandomMood();
    let baseLoot = Math.floor(Math.random() * 300) + 100; // Base loot from NPC
    const finalLoot = calculateLoot(baseLoot, mood);

    await removeCash(userId, interaction.guildId, finalLoot);

    let moodEmoji = mood === "confident" ? "😎" : mood === "scared" ? "😨" : "😐";

    const embed = new EmbedBuilder()
      .setTitle('🧠 You Fought Back!')
      .setDescription(`The robber was **${mood}** ${moodEmoji}, but you lost **$${finalLoot}** trying to defend yourself!`)
      .setColor('#aa0000');

    return await interaction.editReply({ embeds: [embed], components: [] });
  } catch (err) {
    console.error("[NPC ROBBERY BUTTON ERROR]", err);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ Something went wrong fighting the robber.", ephemeral: true });
    }
  }
}
  
} catch (err) {
  console.error('❌ interactionCreate handler failed:', err);
}
});


function getHelpPages() {
  return [
    new EmbedBuilder()
      .setTitle('🎮 Core Gameplay')
      .setDescription('`!ping`, `!daily`, `!balance`, `!inventory`, `!use`, `!lootbox`...')
      .setFooter({ text: 'Page 1 of 3' }),

    new EmbedBuilder()
      .setTitle('💰 Gambling Games')
      .setDescription('`!flip heads 50`, `!slots 100`, `!gambleitem medal`, `!buyticket`...')
      .setFooter({ text: 'Page 2 of 3' }),

    new EmbedBuilder()
      .setTitle('🛍️ Shops & Leaderboards')
      .setDescription('`!shop`, `!buyitem dice`, `!topxp`, `!richest`, `!topcollectors`, `!rank`, `!leaderboard`...')
      .setFooter({ text: 'Page 3 of 3' }),
  ];
}

async function updateShopEmbed() {
  if (!lastShopMessage) return; // No shop message to update

  const remainingMs = nextRotationTimestamp - Date.now();
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  const embed = new EmbedBuilder()
    .setTitle('🛒 Item Shop (Rotating)')
    .setDescription(`🕒 Next rotation in **${minutes}m ${seconds}s**`)
    .setColor('#33cc33');

  const components = [];

  for (const item of rotatingShop) {
    embed.addFields({
      name: `${item.emoji || ''} ${item.name} — $${item.price}`,
      value: `${item.description || 'No description'}\nStock: **${item.stock}**`,
      inline: false
    });

    const button = new ButtonBuilder()
      .setCustomId(`buy_item_${item.id}`)
      .setLabel(`🛒 Buy ${item.name}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(item.stock <= 0);
    
    components.push(button);
  }

  const rows = [];
  for (let i = 0; i < components.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(components.slice(i, i + 5)));
  }

  try {
    await lastShopMessage.edit({ embeds: [embed], components: rows });
  } catch (err) {
    console.error("❌ Failed to update shop message:", err);
  }
}


client.commands.set('snipe', {
  async execute(message) {
    const tracked = getAllSnipers();
    if (!tracked.length) return message.reply("🔍 No active sniper targets.");

    const lines = tracked.map(s =>
      `• **${s.ticker}** (Added by: <@${s.addedBy}>, Source: ${s.source})`
    );
    message.reply("🎯 Current Sniper Targets:\n" + lines.join('\n'));
  }
});

client.commands.set('track', {
  async execute(message, args) {
    const ticker = args[0]?.toUpperCase();
    if (!ticker) return message.reply("Usage: `!track <TICKER>`");

    addTrackedTicker(ticker, 'manual', message.author.id);
    message.reply(`🛰️ Now tracking **${ticker}** for sniper activity.`);
  }
});

client.commands.set('sniperlog', {
  async execute(message) {
    const channel = client.channels.cache.get('1362077468076539904'); // Finance channel
    if (channel) {
      channel.send(`📈 Sniper Report requested by <@${message.author.id}> — view logs in pinned messages.`);
      message.reply("📬 Posted sniper log message in #finance-intel.");
    }
  }
});

client.commands.set('penny', {
  async execute(message, args) {
    const ticker = args[0]?.toUpperCase();
    if (!ticker) return message.reply("Usage: `!penny <TICKER>`");

    const price = await fetchStockPrice(ticker);
    if (!isPennyStock(price)) return message.reply(`❌ ${ticker} is not a penny stock.`);

    addTrackedTicker(ticker, 'penny', message.author.id);
    message.reply(`🪙 Tracking **${ticker}** as a potential penny sniper play.`);
  }
});

client.commands.set('nominate', {
  async execute(message, args) {
    const ticker = args[0]?.toUpperCase();
    if (!ticker) return message.reply("Usage: `!nominate <TICKER>`");

    addTrackedTicker(ticker, 'nomination', message.author.id);
    message.reply(`🎯 You nominated **${ticker}** as a sniper play. We'll start watching it closely.`);
  }
});


const SPORTS_CHANNEL_NAME = 'sports-intel';


client.commands.set('watchticker', {
  execute(message, args) {
    const ticker = args[0]?.toUpperCase();
    if (!ticker) return message.reply("Usage: `!watchticker TICKER`");
    watchlist.add(ticker);
    message.reply(`📈 Added ${ticker} to watchlist.`);
  }
});

function rotateSnipers() {
  const channel = client.channels.cache.get(FINANCE_CHANNEL_ID);
  const currentRotation = getSniperRotation();

  if (!currentRotation.length) {
    channel.send("⚠️ No tickers found for rotation.");
    return;
  }

  todaySnipes = currentRotation; // ✅ Save this for the interval scans

  channel.send(`🧠 **Daily Sniper Rotation Activated**\nTracking:\n${currentRotation.map(t => `• $${t}`).join('\n')}\n\nStay alert.`);

  currentRotation.forEach(ticker => {
    scanOptionsFlow(client, ticker);
  });
}



client.commands.set('rotate', {
  execute(message) {
    if (message.channel.name !== 'finance-intel') return;
    rotateSnipers(); // No need to pass client
    message.reply("🔄 Sniper rotation triggered manually.");
  }
});

client.commands.set('buyreal', {
  async execute(message, args) {
    if (message.channel.name !== 'bank') {
      return message.reply('Please use this command inside #bank.');
    }

    const itemId = args[0];
    const item = realShopItems.find(i => i.id === itemId);

    if (!item) {
      return message.reply(`Item not found. Try: ${realShopItems.map(i => `\`${i.id}\``).join(', ')}`);
    }

    const userBalance = await getBalance(message.author.id, message.guild.id);
    if (userBalance < item.cost) {
      return message.reply(`You need ${item.cost} DreamworldPoints to buy this.`);
    }

    await removeCash(message.author.id, message.guild.id, item.cost);

    message.author.send(
      `📝 Shipping Info Request:
You purchased **${item.name}** for ${item.cost} DreamworldPoints.

To complete your order, reply with:
**Name**
**Full Address**
**Email**

⚠️ You will receive a secure link to pay $${item.shippingFeeUSD} for shipping & handling.`
    );

    message.reply(`✅ You bought **${item.name}**! Check your DMs to enter shipping info.`);
  }
});

client.commands.set('realshop', {
  execute(message) {
    if (message.channel.name !== 'bank') {
      return message.reply('Use this in the #bank channel only.');
    }

    for (const item of realShopItems) {
      const embed = new EmbedBuilder()
        .setTitle(item.name)
        .setDescription(`${item.description}\n💰 Cost: ${item.cost} DreamworldPoints\n📦 S&H: $${item.shippingFeeUSD}`)
        .setImage(`https://discord-community-bot.onrender.com/sharedphotos/${item.image.split('/').pop()}`)
        .setColor('#00ffcc');

      message.channel.send({ embeds: [embed] });
    }
  }
});

client.commands.set('banktotal', {
  async execute(message) {
    if (message.channel.name !== 'bank') return;

    const [cashSum, tokenSum, bankSum] = await Promise.all([
      Currency.aggregate([{ $group: { _id: null, total: { $sum: "$cash" } } }]),
      TokenModel.aggregate([{ $group: { _id: null, total: { $sum: "$tokensWon" } } }]),
      DealerProfile.aggregate([{ $group: { _id: null, total: { $sum: "$bankBalance" } } }])
    ]);

    const totalCash = cashSum[0]?.total || 0;
    const totalTokens = tokenSum[0]?.total || 0;
    const totalBank = bankSum[0]?.total || 0;
    const combined = totalCash + totalTokens + totalBank;

    const embed = new EmbedBuilder()
      .setTitle('🏦 Dreamworld Point Bank Broadcast')
      .setDescription(`**Current Wealth Circulation Report**\n\n💵 **Liquid Cash:** $${totalCash.toLocaleString()}\n🏛️ **Bank Deposits:** $${totalBank.toLocaleString()}\n🎲 **DreamTokens:** ${totalTokens.toLocaleString()} tokens\n\n🧮 **Combined Total:** $${combined.toLocaleString()}`)
      .setColor('#ffaa00')
      .setImage('https://img.youtube.com/vi/WVWhYQhtXBE/maxresdefault.jpg')
      .setURL('https://www.youtube.com/watch?v=WVWhYQhtXBE') // Clickable video
      .setFooter({ text: 'Dreamworld Bank • Broadcast feed encrypted by the House' });

    await message.channel.send({ embeds: [embed] });

    // Autoplay video (simulate it via a follow-up link since embeds can't autoplay in Discord)
    await message.channel.send(`▶️ **Live Feed:** https://www.youtube.com/embed/WVWhYQhtXBE?autoplay=1&mute=1`);
  }
});


const stealCooldown = new Set();
const { isInPrison, disabledWhileInPrison } = require('./economy/prisonSystem');


client.commands.set('steal', {
  async execute(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply("Tag someone to rob: `!steal @user`");
    if (target.id === message.author.id) return message.reply("You can't rob yourself.");

    const hideout = hideoutMap.get(target.id);
    if (hideout && hideout > Date.now()) return message.reply(`🧢 That user is hiding.`);

    const now = Date.now();
    const userId = message.author.id;
    // ⛔ Prevent using while hiding
const playerHideout = hideoutMap.get(userId);
if (playerHideout && playerHideout > Date.now()) {
  return message.reply("⛔ You cannot use `!steal` while hiding in a hideout.");
}
    const cooldown = stealCooldowns.get(userId) || 0;
    if (cooldown > now) return message.reply(`⏳ Cooldown: ${Math.ceil((cooldown - now) / 1000)}s`);

    // 🔒 Auto-prison for trying to rob Slave
    if (target.username === 'Slave' || target.id === '1353724293380440085') {
      sendToPrison(userId, message.guild.id);
      return message.reply("🚔 You tried to rob the wrong slave and got locked up immediately.");
    }

    const [targetBalance, targetInventory, yourBalance, userData, targetData] = await Promise.all([
      getBalance(target.id, message.guild.id),
      getInventory(target.id, message.guild.id),
      getBalance(userId, message.guild.id),
      Levels.fetch(userId, message.guild.id),
      Levels.fetch(target.id, message.guild.id)
    ]);

    const yourLevel = userData?.level || 1;
    const targetLevel = targetData?.level || 1;
    const levelDiff = yourLevel - targetLevel;

    if (targetBalance < 100) return message.reply("They're too broke.");

    if (targetInventory.has('smoke')) {
      const successChance = targetLevel >= 15 ? 0 : targetLevel >= 12 ? 0.15 : targetLevel >= 9 ? 0.3 : targetLevel >= 6 ? 0.5 : 0.8;
      if (Math.random() < successChance) {
        await removeItem(target.id, message.guild.id, 'smoke');
        return message.reply(`💨 <@${target.id}> escaped with a smoke bomb!`);
      } else {
        message.channel.send(`💨 <@${target.id}> tried to use a smoke bomb... but it failed against a high-level attacker!`);
      }
    }

    let baseSuccessRate = 0.5;
    if (isInPrison(target.id)) baseSuccessRate = 0.95;
    else if (levelDiff >= 15) baseSuccessRate = 1;
    else if (levelDiff > 0) baseSuccessRate += Math.min(0.05 * levelDiff, 0.45);

    const success = Math.random() < baseSuccessRate;

    const heat = heatMap.get(userId) || { heat: 0, lastActivity: now };
    const gang = gangMap.get(userId);
    const gangInfo = gangs[gang];

    let alertEmbed;

    if (success) {
      let stealPercent = 0.1 + Math.min(levelDiff * 0.02, 0.9);
      let stolen = Math.floor(targetBalance * stealPercent);
      let finalSteal = Math.min(stolen, targetBalance); // ✅ Prevent negative balance

      if (targetInventory.has('vest')) {
        finalSteal = Math.floor(finalSteal * 0.5);
        await removeItem(target.id, message.guild.id, 'vest');
        message.channel.send(`🛡️ <@${target.id}> blocked some of the damage with a vest!`);
      }

      if (gangInfo?.bonus === "heist") {
        const bonus = Math.floor(finalSteal * 0.15);
        finalSteal += bonus;
        message.channel.send(`🎭 **Gang Bonus:** +$${bonus} from your heist thanks to ${gangInfo.name}.`);
      }

      await Promise.all([
        removeCash(target.id, message.guild.id, finalSteal),
        addCash(userId, message.guild.id, finalSteal)
      ]);

      alertEmbed = new EmbedBuilder()
        .setTitle("💸 Heist Successful!")
        .setDescription(`<@${userId}> stole **$${finalSteal}** from <@${target.id}>.`)
        .setColor("#00ff88")
        .addFields({ name: "🔥 Heat Level", value: getHeatRank(heat.heat), inline: true })
        .setTimestamp();

    } else {
      const lost = Math.floor(yourBalance * (Math.random() * 0.1 + 0.1));
      await removeCash(userId, message.guild.id, lost);

      if (gangInfo?.bonus === "bribe") {
        const refund = Math.floor(lost * 0.25);
        await addCash(userId, message.guild.id, refund);
        message.channel.send(`💵 **Gang Bonus:** Recovered $${refund} with Syndicate bribe.`);
      }

      alertEmbed = new EmbedBuilder()
        .setTitle("🚨 Failed Robbery!")
        .setDescription(`<@${userId}> got caught trying to rob <@${target.id}> and lost **$${lost}**.`)
        .setColor("#ff4444")
        .addFields({ name: "🔥 Heat Level", value: getHeatRank(heat.heat), inline: true })
        .setTimestamp();
    }

    heat.heat += success ? 10 : 5;
    heat.lastActivity = now;

    if (gangInfo?.bonus.includes("Reduced Heat")) {
      heat.heat = Math.max(0, Math.floor(heat.heat * 0.5));
    }

    heatMap.set(userId, heat);

    if (gangInfo) {
      alertEmbed.setAuthor({
        name: `${gangInfo.icon} ${gangInfo.name}`,
        iconURL: message.author.displayAvatarURL()
      });
    }

    message.channel.send({ embeds: [alertEmbed] });

    if (Math.random() < 0.4) {
      spawnFenceDealer(client, message.author, message.guild.id);
    }

    stealCooldowns.set(userId, now + 5 * 60 * 1000);
  }
});


client.commands.set('crime', {
  async execute(message) {
    const userId = message.author.id;
    // ⛔ Prevent using while hiding
const playerHideout = hideoutMap.get(userId);
if (playerHideout && playerHideout > Date.now()) {
  return message.reply("⛔ You cannot use `!crime` while hiding in a hideout.");
}
    const now = Date.now();
    const cooldown = stealCooldowns.get(userId) || 0;
    const timeLeft = cooldown - now;

    if (timeLeft > 0) {
      const seconds = Math.ceil(timeLeft / 1000);
      const embed = new EmbedBuilder()
        .setTitle('⏳ You’re Laying Low...')
        .setDescription(`Try again in **${seconds}s**.`)
        .setColor('#ff4444');
      return message.reply({ embeds: [embed] });
    }

    const userLevel = await Levels.fetchLevel(userId, message.guild.id) || 1;

    // ✅ Send crime mission to the channel
    const missionData = await runCrime(message.channel, message.author, userLevel, message.guild.id);
    activeCrimeData.set(userId, missionData);

    stealCooldowns.set(userId, now + 10 * 60 * 1000);
  }
});


client.commands.set('wanted', {
  execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const state = wantedMap.get(target.id) || { fails: 0, watched: false };

    const embed = new EmbedBuilder()
      .setTitle(`🚔 Wanted Status: ${target.username}`)
      .addFields(
        { name: "❌ Failed Heists", value: `${state.fails} attempt(s)`, inline: true },
        { name: "👁️ Status", value: state.watched ? "🚨 **Watched**" : "✅ Not Watched", inline: true }
      )
      .setColor(state.watched ? "#ff0000" : "#00ff88")
      .setTimestamp()
      .setFooter({ text: 'Crime Watchlist' });

    message.channel.send({ embeds: [embed] });
  }
});

client.commands.set('bounty', {
  async execute(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply("Use: `!bounty @user`");
    if (target.id === message.author.id) return message.reply("You can’t target yourself.");

    const targetState = wantedMap.get(target.id);
    if (!targetState || !targetState.watched) return message.reply("They're not being watched.");

    const hideout = hideoutMap.get(target.id);
    if (hideout && hideout > Date.now()) return message.reply("They're hiding.");

    const [targetInventory] = await Promise.all([
      getInventory(target.id, message.guild.id)
    ]);

    const streak = crimeStreaks.get(target.id) || { success: 0 };
    const heat = heatMap.get(target.id) || { heat: 0 };
    let multiplier = 1;

    multiplier += Math.min(streak.success * 0.1, 0.5);
    if (targetInventory.has('skull')) multiplier += 0.25;
    if (heat.heat >= 100) multiplier += 0.5;
    else if (heat.heat >= 75) multiplier += 0.3;

    let reward = Math.floor((Math.random() * 300 + 200) * multiplier);

    // ✅ GANG BOUNTY CUT
    const gang = gangMap.get(message.author.id);
    const gangInfo = gangs[gang];
    if (gangInfo?.bonus === "bounty") {
      const cut = Math.floor(reward * 0.2);
      await addCash(message.author.id, message.guild.id, cut);
      message.channel.send(`💣 **Gang Bonus:** +$${cut} reward cut from ${gangInfo.name}`);
    }

    await Promise.all([
      addCash(message.author.id, message.guild.id, 100),
      removeCash(target.id, message.guild.id, reward)
    ]);

    const bountyEmbed = new EmbedBuilder()
      .setTitle("🎯 Bounty Placed!")
      .setDescription(`<@${message.author.id}> has placed a bounty on <@${target.id}>`)
      .addFields(
        { name: "💥 Deducted", value: `$${reward}`, inline: true },
        { name: "🔥 Heat Rank", value: getHeatRank(heat.heat), inline: true },
        {
          name: "🎯 Breakdown", value: `
Streak: \`+${Math.min(streak.success * 10, 50)}%\`
Skull: ${targetInventory.has('skull') ? '`+25%`' : '`None`'}
Heat: ${heat.heat >= 100 ? '`+50%`' : heat.heat >= 75 ? '`+30%`' : '`None`'}`.trim()
        }
      )
      .setColor("#ff5555")
      .setTimestamp();

    if (gangInfo) {
      bountyEmbed.setAuthor({
        name: `${gangInfo.icon} ${gangInfo.name}`,
        iconURL: message.author.displayAvatarURL()
      });
    }

    message.channel.send({ embeds: [bountyEmbed] });
    wantedMap.set(target.id, { fails: 0, watched: false });
  }
});

client.commands.set('hideout', {
  async execute(message) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = Date.now();

    const protectionCost = 2500;
    const freeDuration = 10 * 60 * 1000; // 10 mins
    const paidDuration = 60 * 60 * 1000; // 1 hour

    const { getBalance, removeCash, addCash } = require('./economy/currency');
    const DealerProfile = require('./economy/dealerProfileModel');
    const Property = require('./economy/propertyModel');

    const balance = await getBalance(userId, guildId);
    let current = hideoutMap.get(userId);
    let isFirstUse = !current || current < now;

    // 🧮 First-time use: grant free 10 minutes
    if (isFirstUse) {
      current = now + freeDuration;
    } else {
      if (balance < protectionCost) {
        return message.reply(`💸 You need $${protectionCost} to extend your hideout time.`);
      }
      await removeCash(userId, guildId, protectionCost);
      current += paidDuration;
    }

    hideoutMap.set(userId, current);

    // 🔥 Reduce heat
    const heat = heatMap.get(userId) || { heat: 0, lastActivity: now };
    heat.heat = Math.max(heat.heat - 5, 0);
    heat.lastActivity = now;
    heatMap.set(userId, heat);

    // 🏠 Distribute property passive income
    const ownerProps = await Property.find({ ownerId: { $ne: null } });
    for (const prop of ownerProps) {
      const payout = isFirstUse ? 500 : 1800;
      const bankCut = isFirstUse ? 0 : 700;

      await addCash(prop.ownerId, guildId, payout);
      if (bankCut) {
        const bank = await DealerProfile.findOne({ userId: 'BANK_AI', guildId });
        if (bank) {
          bank.cash = (bank.cash || 0) + bankCut;
          await bank.save();
        }
      }

      const ownerUser = await client.users.fetch(prop.ownerId).catch(() => null);
      if (ownerUser) {
        ownerUser.send(`🏚️ Someone used a hideout on your turf. +$${payout} income.`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("🏚️ Hideout Activated")
      .setDescription("You're protected from real player attacks and cannot perform certain actions.")
      .addFields(
        { name: "🕒 Protection Ends", value: `<t:${Math.floor(current / 1000)}:R>`, inline: true },
        { name: "💰 Cost", value: isFirstUse ? "Free (10m)" : `$${protectionCost} deducted`, inline: true },
        { name: "⛔ Disabled Commands", value: "`!steal`, `!crime`, `!scavenge`, `!lurk`, `!raid`", inline: false }
      )
      .setFooter({ text: "You can stack hideout time as needed or end it manually." })
      .setColor("#4466ff")
      .setTimestamp();

    if (heat.heat >= 10) {
      embed.addFields({ name: "🔥 Heat", value: "Your heat was reduced while hiding." });
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`extend_hideout_${userId}`)
        .setLabel('⏳ Extend 1h ($2500)')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`leave_hideout_${userId}`)
        .setLabel('🚪 Leave Hideout')
        .setStyle(ButtonStyle.Danger)
    );

    message.channel.send({ embeds: [embed], components: [buttons] });
  }
});


client.commands.set('use', {
  async execute(message, args) {
    const userId = message.author.id;
    const item = args[0]?.toLowerCase();
    const amount = parseInt(args[1]) || 1;

    const key = `use_${item}_${userId}`;
global.useCounts = global.useCounts || new Map();
global.useCounts.set(key, (global.useCounts.get(key) || 0) + amount);


    if (!item) return message.reply("Usage: `!use <item> [amount]`");

    const inventory = await getInventory(userId, message.guild.id);
    if (!inventory.has(item)) return message.reply("❌ You don’t own that item.");

    const currentCount = inventory.get(item);
    if (currentCount < amount) return message.reply(`❌ You only have ${currentCount} ${item}(s).`);

    await removeItem(userId, message.guild.id, item, amount);
    // Track Combo Usage Sequence
let combo = itemComboTracker.get(userId) || [];
combo.push(item);
if (combo.length > 3) combo = combo.slice(-3);
itemComboTracker.set(userId, combo);

// Check for special combo: Gem → Dice → Skull
if (combo.join(',') === 'gem,dice,skull') {
  comboBuffs.set(userId, {
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 min buff
    bonuses: {
      xpBoost: 1.5,
      rareDropBoost: true,
      crimeBonus: true
    }
  });

  const embed = new EmbedBuilder()
    .setTitle("🧬 Combo Activated: Greedy Gambler")
    .setDescription("You've triggered a powerful chain! For the next 15 minutes:\n- 🧠 XP Boost x1.5\n- 🎲 Better odds on crime\n- 💎 Rare item drop chance increased")
    .setColor("#ff55ff")
    .setFooter({ text: "Greedy Gambler Activated" })
    .setTimestamp();

  message.channel.send({ content: `<@${userId}>`, embeds: [embed] });

  // Reset combo so it doesn’t stack again immediately
  itemComboTracker.set(userId, []);
}


    const emojiMap = {
      gem: '💎',
      medal: '🎖️',
      dice: '🎲',
      skull: '💀',
      disguise: '🕵️',
      lease: '🏠',
    };
    const emoji = emojiMap[item] || '🔸';

    // Animation
    const useMsg = await message.channel.send(`Consuming ${amount} ${item}(s)...`);
    const steps = Math.min(amount, 10);
    for (let i = 1; i <= steps; i++) {
      await new Promise(res => setTimeout(res, 200));
      await useMsg.edit(emoji.repeat(i));
    }

    let resultText = "✅ You used your items.";

    switch (item) {
      case 'vest':
        resultText = `🛡️ You equipped a Reflective Vest. It'll block the next robbery attempt.`;
        // No immediate effect — it's consumed automatically in the steal command
        break;
      

      case 'gem':
        await addCash(userId, message.guild.id, 100 * amount);
        resultText = `💸 You used ${amount} Gem(s) and gained $${amount * 100} DreamworldPoints.`;
        break;

      case 'medal':
        await addCash(userId, message.guild.id, 50 * amount);
        resultText = `🎖️ You used ${amount} Medal(s) and gained $${amount * 50} DreamworldPoints.`;
        break;

      case 'dice':
        const totalXP = Array.from({ length: amount }, () => Math.floor(Math.random() * 20 + 10)).reduce((a, b) => a + b, 0);
        await Levels.appendXp(userId, message.guild.id, totalXP);
        resultText = `🎲 You rolled ${amount} Dice and gained ${totalXP} XP.`;
        break;

      case 'skull':
        const oldCooldown = stealCooldowns.get(userId) || 0;
        stealCooldowns.set(userId, Math.max(Date.now(), oldCooldown - 2 * 60 * 1000 * amount));
        resultText = `💀 You used ${amount} Skull Ring(s). Crime cooldown reduced by ${2 * amount} minutes.`;
        break;

      case 'disguise':
        wantedMap.set(userId, { fails: 0, watched: false });
        hideoutMap.set(userId, Date.now() + 5 * 60 * 1000);
        const stats = pvpStats.get(userId) || { bounties: 0, pvpWins: 0, hideouts: 0, survived: 0 };
        stats.hideouts++;
        pvpStats.set(userId, stats);
        if (stats.hideouts === 10) {
          unlockAchievement(userId, "Shadow Lurker", "🕵️", "Used the hideout 10 times to stay unseen.", message.channel);
        }
        resultText = "🕵️ You used a Disguise Kit. You’re hidden from other players for 5 minutes.";
        break;

      case 'lease':
        hideoutMap.set(userId, Date.now() + 10 * 60 * 1000);
        resultText = "🏡 You extended your safehouse lease. You’re hidden for 10 minutes.";
        break;

      default:
        resultText = "⚠️ That item doesn’t have a use yet...";
    }

    await useMsg.edit(resultText);
  }
});

client.commands.set('lurk', {
  async execute(message) {
    const userId = message.author.id;
    // ⛔ Prevent using while hiding
const playerHideout = hideoutMap.get(userId);
if (playerHideout && playerHideout > Date.now()) {
  return message.reply("⛔ You cannot use `!steal` while hiding in a hideout.");
}
    const guildId = message.guild.id;

    const userData = await Levels.fetch(userId, guildId);
    const level = userData?.level || 1;
    const stats = getPlayerStats(userId, guildId);
    const intellect = stats.intellect || 0;
    const grit = stats.grit || 0;
    const luck = stats.luck || 0;
    const xpBonus = 1 + (intellect * 0.03);

    const gainedXP = Math.floor((Math.random() * 10 + 1) * xpBonus);
    await Levels.appendXp(userId, guildId, gainedXP);

    const mainEmbed = new EmbedBuilder()
      .setTitle("🕶️ You’re Lurking in the Shadows...")
      .setDescription(`You kept a low profile and gained **${gainedXP} XP**.`)
      .setThumbnail(message.author.displayAvatarURL())
      .setColor('#5555ff')
      .setFooter({ text: "No one noticed... or did they?" });

    await message.channel.send({ embeds: [mainEmbed] });

    // 🎭 Drama trigger w/ disguise + stats logic
    const hasDisguise = await hasItem(userId, 'disguise');
    const baseChance = 0.05 + (luck * 0.01);
    const dramaChance = hasDisguise ? baseChance / 2 : baseChance;
    if (Math.random() < dramaChance) {
      const dramaLines = [
        grit < 3 && "😨 Your nerves gave you away. Someone heard you breathing too hard.",
        intellect < 3 && "📹 You miscalculated the shadows. A camera caught you.",
        luck < 3 && "🚓 Wrong alley. Wrong time. A patrol was already watching.",
        "👀 You thought you could lurk... but got noticed."
      ].filter(Boolean);

      const dramaEmbed = new EmbedBuilder()
        .setTitle("👀 Uh oh...")
        .setDescription(`<@${userId}> ${dramaLines[Math.floor(Math.random() * dramaLines.length)]}`)
        .setColor('#ff4444')
        .setFooter({ text: 'Stay invisible, or pay the price.' });

      await message.channel.send({ embeds: [dramaEmbed] });
    }

    // 🔍 Recon Logic — XP-influenced
    const members = await message.guild.members.fetch();
    const visible = members.filter(m => !m.user.bot && m.id !== userId).map(m => m.user);
    if (!visible.length) return;

    const reconCount = 1 + Math.floor(luck / 3) + Math.floor(level / 10);
    const reconTargets = [];

    while (reconTargets.length < reconCount && visible.length > 0) {
      const pick = visible.splice(Math.floor(Math.random() * visible.length), 1)[0];
      if (pick) reconTargets.push(pick);
    }

    if (!global.lurkLogs) global.lurkLogs = new Map();
    const log = global.lurkLogs.get(userId) || [];

    for (const target of reconTargets) {
      const bal = await getBalance(target.id, guildId);
      const inv = await getInventory(target.id, guildId);
      const inGang = gangMap.has(userId);

      const fields = [`🧑‍💼 **${target.username}**`];
      if (level >= 5) fields.push(`💰 **$${bal}**`);
      if (level >= 10) fields.push(`🎒 Inventory: **${inv.size}** items`);

      const recon = new EmbedBuilder()
        .setTitle("📡 Lurk Recon Intel")
        .setThumbnail(target.displayAvatarURL())
        .setDescription(fields.join('\n'))
        .setColor('#8888ff')
        .setFooter({ text: `Unlocked at level ${level}` });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`steal_${target.id}`)
          .setLabel('💸 Steal')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`recruit_${target.id}`)
          .setLabel('🤝 Invite to Gang')
          .setStyle(ButtonStyle.Success)
          .setDisabled(!inGang),
        new ButtonBuilder()
          .setCustomId(`attack_${target.id}_${userId}`)
          .setLabel('🗡️ Attack Player')
          .setStyle(ButtonStyle.Danger)
      );

      message.channel.send({ embeds: [recon], components: [buttons] });
      log.push({ target: target.username, time: Date.now(), bal, items: inv.size });
    }

    global.lurkLogs.set(userId, log.slice(-10));
  }
});


client.commands.set('lurklog', {
  async execute(message) {
    const logs = global.lurkLogs?.get(message.author.id) || [];

    if (!logs.length) return message.reply("🕶️ No recon logs found yet.");

    const embed = new EmbedBuilder()
      .setTitle("📜 Your Lurk Log")
      .setDescription("Your last 5 recon targets.\nPublic sees this message but only you see the intel.")
      .setColor('#444488');

    logs.slice(-5).reverse().forEach(log => {
      embed.addFields({
        name: `🕵️ ${log.target}`,
        value: `💰 ||$${log.bal}||\n🎒 ||${log.items} items||\n⏱️ <t:${Math.floor(log.time / 1000)}:R>`,
        inline: false
      });
    });

    message.channel.send(`📡 <@${message.author.id}> opened their **Lurk Log**.`); // public
    message.author.send({ embeds: [embed] }).catch(() => {
      message.reply("❌ Couldn’t DM you the logs. Check your privacy settings.");
    });
  }
});

client.commands.set('scavenge', {
  async execute(message) {
    const userId = message.author.id;
    // ⛔ Prevent using while hiding
const playerHideout = hideoutMap.get(userId);
if (playerHideout && playerHideout > Date.now()) {
  return message.reply("⛔ You cannot use `!sscavenge` while hiding in a hideout.");
}

    // Cooldown check (10 minutes)
    const cooldown = scavengeCooldowns.get(userId) || 0;
    const now = Date.now();
    if (cooldown > now) {
      const secondsLeft = Math.ceil((cooldown - now) / 1000);
      return message.reply(`🕳️ You're still searching... try again in ${secondsLeft}s.`);
    }

    const failChance = Math.random();
    if (failChance < 0.25) {
      // 25% chance to find nothing
      scavengeCooldowns.set(userId, now + 10 * 60 * 1000);
      return message.reply("🪨 You rummaged through trash but found nothing this time.");
    }

    // Reward range
    const cash = Math.floor(Math.random() * 70) + 30; // $30–$100
    const xp = Math.floor(Math.random() * 30) + 20;   // 20–50 XP

    await addCash(userId, message.guild.id, cash);
    await Levels.appendXp(userId, message.guild.id, xp);

    scavengeCooldowns.set(userId, now + 10 * 60 * 1000);

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Scavenge Results")
      .setDescription(`You found some scraps while scavenging.`)
      .addFields(
        { name: "💸 Cash", value: `$${cash}`, inline: true },
        { name: "🧠 XP", value: `${xp} XP`, inline: true }
      )
      .setColor("#999999")
      .setFooter({ text: "Try again in 10 minutes." })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
});

client.commands.set('heat', {
  execute(message) {
    const data = heatMap.get(message.author.id) || { heat: 0 };
    const rank = getHeatRank(data.heat);

    const embed = new EmbedBuilder()
      .setTitle("🔥 Your Heat Rank")
      .setDescription(`You are currently marked as: **${rank}**\nHeat Score: ${data.heat}/100`)
      .setColor('#ff4444')
      .setFooter({ text: "Crime reputation affects all player battle rewards..." });

    message.channel.send({ embeds: [embed] });
  }
});


// Gang definitions
const gangs = {
  voodoo: {
    name: "On Point Gang",
    icon: "👓",
    bonus: "+1m cooldown to robbery attempts against you",
    color: "#aa00ff" // purple
  },
  blitz: {
    name: "Blitz Mode",
    icon: "🚬",
    bonus: "+15% XP and +10% cash from challenges",
    color: "#ff2200" // red-orange
  },
  killers: {
    name: "Red Box Service",
    icon: "⚰🩸",
    bonus: "+25% real player steal damage",
    color: "#cc0000" // deep red
  },
  bribe: {
    name: "Blue Fence",
    icon: "🙅‍♂️💵",
    bonus: "+10% item profit",
    color: "#55cc55" // money green
  },
  whisper: {
    name: "Digital Wipe",
    icon: "👨‍💻🧢",
    bonus: "-50% heat gain",
    color: "#339999" // stealth teal
  },
  challenge: {
    name: "Golden Chicken",
    icon: "🏆",
    bonus: "Duel Bonus Payouts",
    color: "#ffaa00" // gold
  },
  bounty: {
    name: "Catching Rank",
    icon: "💣",
    bonus: "Bonus Bounty Rewards",
    color: "#ff6600" // fiery orange
  },
  heist: {
    name: "Lost and Found",
    icon: "👅",
    bonus: "Steal Bonus Payouts",
    color: "#888888" // gray
  },
  syndicate: {
    name: "Diamond House",
    icon: "💎🏠",
    bonus: "Item Sale Bonus",
    color: "#00aa99" // turquoise
  }
};


// == !joingang Command ==
client.commands.set("joingang", {
  async execute(message, args) {
    const choice = (args[0] || "").toLowerCase();
    if (!gangs[choice]) {
      const gangList = Object.entries(gangs)
        .map(([key, g]) => `**${g.icon} ${g.name}** - ${g.bonus} → \`!joingang ${key}\``)
        .join("\n");
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("Choose Your Gang")
            .setDescription(gangList)
            .setColor("#aa00ff")
        ]
      });
    }

    const userId = message.author.id;
    const guildId = message.guild.id;
    const gang = gangs[choice];

    gangMap.set(userId, choice);

    const user = await Currency.findOne({ userId, guildId }) || new Currency({ userId, guildId });

    // ✅ Set username for gang display
    user.username = message.author.username;
    user.gang = choice;

    await user.save();

    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (member) {
      for (const key in gangs) {
        const oldRole = message.guild.roles.cache.find(r => r.name === gangs[key].name);
        if (oldRole && member.roles.cache.has(oldRole.id)) {
          await member.roles.remove(oldRole).catch(() => {});
        }
      }
    }

    const gangRoleName = gang.name;
    let role = message.guild.roles.cache.find(r => r.name === gangRoleName);

    if (!role) {
      role = await message.guild.roles.create({
        name: gangRoleName,
        color: gang.color || "#ff5555",
        reason: `Auto-created gang role for ${gang.name}`
      });
    }

    if (member) {
      await member.roles.add(role).catch(() => {});
    }

    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${gang.icon} Joined ${gang.name}`)
          .setDescription(`You are now a member of the **${gang.name}**. Bonus: ${gang.bonus}`)
          .setColor(gang.color || "#ff4488")
      ]
    });
  },
});



function generatePrices() {
  const prices = {};
  for (const d of drugs) {
    prices[d.id] = d.base + Math.floor(Math.random() * (d.volatility * 2 + 1)) - d.volatility;
  }
  return prices;
}


// == Helper Function ==
function getGang(userId) {
  const key = gangMap.get(userId);
  return key ? gangs[key].icon + " " + gangs[key].name : "None";
}

// == !ganginfo Command ==
client.commands.set('ganginfo', {
  async execute(message) {
    const user = await Currency.findOne({ userId: message.author.id, guildId: message.guild.id });
    const gangKey = user?.gang;
    const gang = gangs[gangKey];

    if (!gang) {
      return message.reply("You are not part of any gang. Use `!joingang` to pick one.");
    }

    const embed = new EmbedBuilder()
      .setTitle(`${gang.icon} ${gang.name}`)
      .setDescription(`
You are a member of **${gang.name}**.
Your gang bonus: **${gang.bonus}**

Gang allegiance grants power, protection, and purpose. Strength in numbers is everything...
      `)
      .setColor(gang.color || "#cccccc")
      .setFooter({ text: "Gang allegiance is permanent... for now." })
      .setThumbnail(message.author.displayAvatarURL())
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
});


client.commands.set('turf', {
  execute(message) {
    const lines = [];
    for (const [zone, data] of turfZones.entries()) {
      lines.push(`🏙️ **${zone}** — Controlled by: **${getGangEmoji(data.owner)} ${data.owner}**`);
    }

    const embed = new EmbedBuilder()
      .setTitle("🌆 Current Turf Control")
      .setDescription(lines.join("\n"))
      .setColor('#ffaa00')
      .setFooter({ text: "Use !raid <zone> to attack." });

    message.channel.send({ embeds: [embed] });
  }
});

client.commands.set('raid', {
  async execute(message, args) {
    const zone = args.join(" ");
    if (!turfZones.has(zone)) {
      return message.reply("❌ That zone doesn't exist. Try: Downtown, Back Alley, Warehouse");
    }

    const now = Date.now();
    const userId = message.author.id;
    // ⛔ Prevent using while hiding
const playerHideout = hideoutMap.get(userId);
if (playerHideout && playerHideout > Date.now()) {
  return message.reply("⛔ You cannot use `!raid` while hiding in a hideout.");
}
    const userGangKey = gangMap.get(userId);
    const userGang = gangs[userGangKey];

    if (!userGang) return message.reply("❌ You must be in a gang to initiate a raid.");

    const cooldown = turfRaidCooldowns.get(userId) || 0;
    if (now < cooldown) {
      const seconds = Math.ceil((cooldown - now) / 1000);
      return message.reply(`⏳ You must wait ${seconds}s before launching another raid.`);
    }

    const zoneData = turfZones.get(zone);
    const defendingGangKey = zoneData.owner;
    const defendingGang = gangs[defendingGangKey];

    if (defendingGangKey === userGangKey) {
      return message.reply("⚠️ You already control this zone.");
    }

    const success = Math.random() < 0.5;
    const resultTitle = success ? "🚩 Raid Successful" : "🛑 Raid Repelled!";

    const embed = new EmbedBuilder()
      .setTitle(resultTitle)
      .setDescription(
        success
          ? `**<@${userId}>** and the **${userGang.icon} ${userGang.name}** took over **${zone}** from the **${defendingGang?.icon || "❓"} ${defendingGang?.name || "Unclaimed"}**!`
          : `**<@${userId}>** led an attack on **${zone}**, but the **${defendingGang?.icon || "❓"} ${defendingGang?.name || "Unknown"}** held firm.`
      )
      .addFields(
        { name: "📍 Zone", value: `**${zone}**`, inline: true },
        { name: "🔁 Cooldown", value: "5 minutes", inline: true },
        { name: "🎭 Attacker", value: `${userGang.icon} ${userGang.name}`, inline: true },
        { name: "🛡️ Defender", value: `${defendingGang?.icon || "❓"} ${defendingGang?.name || "Unclaimed"}`, inline: true }
      )
      .setColor(success ? userGang.color : "#ff4444")
      .setThumbnail(message.author.displayAvatarURL())
      .setFooter({ text: success ? "Turf Captured" : "Defense Successful" })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });

    if (success) {
      turfZones.set(zone, { owner: userGangKey, lastRaid: now });
    }

    turfRaidCooldowns.set(userId, now + 5 * 60 * 1000);
  }
});

client.commands.set('fortifyproperty', {
  async execute(message, args) {
    const Property = require('./economy/propertyModel');
    const { getInventory, removeItem } = require('./economy/inventory');
    const userId = message.author.id;
    const guildId = message.guild.id;
    const propId = args[0];

    if (!propId) return message.reply("Usage: `!fortifyproperty <propertyId>`");

    const property = await Property.findOne({ id: propId });
    if (!property || property.ownerId !== userId) {
      return message.reply("❌ You don't own that property.");
    }

    const inv = await getInventory(userId, guildId);
    if ((inv.gas || 0) < 1 || (inv.disguise || 0) < 1) {
      return message.reply("🧪 You need 1x gas and 1x disguise to fortify a property.");
    }

    await removeItem(userId, guildId, 'gas', 1);
    await removeItem(userId, guildId, 'disguise', 1);

    const now = new Date();
    const nextProtect = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    property.fortifiedUntil = nextProtect;
    await property.save();

    return message.reply(`🛡️ Your property **${property.id}** is fortified until <t:${Math.floor(nextProtect.getTime() / 1000)}:R>`);
  }
});


client.commands.set('fortify', {
  async execute(message, args) {
    const userId = message.author.id;
    const gang = gangMap.get(userId);
    if (!gang) return message.reply("❌ You must be in a gang to fortify turf.");

    const ownedZones = [...turfZones.entries()].filter(([_, zone]) => zone.owner === gang);
    if (ownedZones.length === 0) {
      return message.reply("❌ Your gang doesn't own any turf to fortify.");
    }

    const zone = ownedZones[0][0]; // Pick the first owned turf
    const level = turfFortifications.get(zone) || 0;
    if (level >= 3) {
      return message.reply(`🏰 **${zone}** is already fully fortified.`);
    }

    const newLevel = level + 1;
    turfFortifications.set(zone, newLevel);

    const emojis = ["🔰", "🛡️", "🏰"];
    const embed = new EmbedBuilder()
      .setTitle("🔧 Turf Fortified!")
      .setDescription(`**<@${userId}>** has fortified **${zone}**.\nFortification Level: ${emojis[newLevel - 1]} (${newLevel}/3)`)
      .setColor("#0088ff")
      .setFooter({ text: `${gang} stronghold reinforced.` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
});

const timeAgo = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60 * 1000) return "just now";
  const mins = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${mins} minute${mins > 1 ? "s" : ""} ago`;
};

client.commands.set('map', {
  async execute(message) {
    const emojis = ["🔰", "🛡️", "🏰"];
    const embed = new EmbedBuilder()
      .setTitle("🗺️ Turf Map")
      .setDescription("Current status of all gang-controlled zones.")
      .setColor("#ffaa00")
      .setFooter({ text: "Use !raid <zone> to challenge a turf." })
      .setTimestamp();

    for (const [zone, data] of turfZones.entries()) {
      const fort = turfFortifications.get(zone) || 0;
      const emoji = emojis[fort - 1] || "❌";
      const last = data.lastRaid ? timeAgo(data.lastRaid) : "Never";
      embed.addFields({
        name: `🏙️ ${zone}`,
        value: `👑 Owner: ${data.owner}\n🛡️ Fort: ${emoji} (${fort}/3)\n⏱️ Last Raid: ${last}`,
        inline: false
      });
    }

    message.channel.send({ embeds: [embed] });
  }
});

// Dealer Command - Street Market Window (live)
client.commands.set('dealer', {
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    let profile = await DealerProfile.findOne({ userId, guildId });

    if (!profile) {
      profile = new DealerProfile({
        userId,
        guildId,
        stashCap: 20,
        stashUsed: 0,
        inventory: new Map(),
        prices: new Map(Object.entries(generatePrices())),
        lastPriceUpdate: Date.now(),
        raidCooldown: 0
      });
    } else {
      // ✅ Restore inventory if saved as object
      if (!(profile.inventory instanceof Map)) {
        profile.inventory = new Map(Object.entries(profile.inventory));
        profile.markModified('inventory');
      }

      // ✅ Restore prices as Map if needed
      if (!(profile.prices instanceof Map)) {
        profile.prices = new Map(Object.entries(profile.prices));
        profile.markModified('prices');
      }

      // ✅ Ensure all drugs are accounted for
      for (const d of drugs) {
        if (!profile.inventory.has(d.id)) {
          profile.inventory.set(d.id, 0);
          profile.markModified('inventory');
        }
      }
    }

    // ✅ Recalculate stash count from inventory
    profile.stashUsed = [...profile.inventory.values()].reduce(
      (a, b) => a + (typeof b === 'number' ? b : 0),
      0
    );

    // 🚀 Check if a Bulk Buyer should appear based on stash size
    const stashCount = profile.stashUsed;
    let bulkChance = 0;
    if (stashCount >= 100) bulkChance = 0.5;  // 50% chance if 100+
    else if (stashCount >= 50) bulkChance = 0.25;  // 25% chance if 50+

    if (Math.random() < bulkChance) {
      await spawnBulkBuyer(client, userId, guildId, message.channel);
    }

    const now = Date.now();
    if (now - profile.lastPriceUpdate > 60000) {
      const updated = generatePrices();

      for (const [key, value] of Object.entries(updated)) {
        profile.prices.set(key, value);
      }
      profile.lastPriceUpdate = now;
      profile.markModified('prices');
    }

    // ✅ Stash capacity warnings
    const stashRatio = profile.stashUsed / profile.stashCap;
    if (stashRatio >= 1) {
      message.channel.send(`🚫 <@${userId}> your stash is **full** (${profile.stashUsed}/${profile.stashCap})!`);
    } else if (stashRatio >= 0.9) {
      message.channel.send(`⚠️ <@${userId}> your stash is **almost full** (${profile.stashUsed}/${profile.stashCap})!`);
    }

    // ✅ Spike warnings
    for (const d of drugs) {
      const price = profile.prices.get(d.id);
      if (price > d.base * 1.5) {
        message.channel.send(`📈 ${d.name} is spiking at $${price}! Time to move fast!`);
      }
    }

    const balance = await getBalance(userId, guildId);
    const embed = generateMarketEmbed(message.author, profile, balance);

    const rows = [];
    for (let i = 0; i < drugs.length; i += 2) {
      const row = new ActionRowBuilder();
      for (let j = i; j < i + 2 && j < drugs.length; j++) {
        const d = drugs[j];
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`buy_drug_${d.id}`)
            .setLabel(`🛒 Buy ${d.name.replace(/[^a-zA-Z]/g, '')}`)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`sell_drug_${d.id}`)
            .setLabel(`💰 Sell ${d.name.replace(/[^a-zA-Z]/g, '')}`)
            .setStyle(ButtonStyle.Secondary)
        );
      }
      rows.push(row);
    }

    const sent = await message.channel.send({ embeds: [embed], components: rows });
    profile.lastMarketMessageId = sent.id;

    await profile.save(); // 💾 Final and safe
  }
});


// ADMIN COMMAND !award @user 1000 //
client.commands.set('award', {
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply("❌ You need admin permissions to use this command.");
    }

    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply("Usage: `!award @user 500`");
    }

    await addCash(target.id, message.guild.id, amount);
    message.channel.send(`💸 Awarded <@${target.id}> with **$${amount}** DreamworldPoints.`);
  }
});


// Run this every 5 minutes
setInterval(() => {
  for (const t of todaySnipes) {
    scanTicker(client, t);
    scanOptionsFlow(client, t);
  }
}, 14400 * 60 * 1000);


cron.schedule('0 16 * * *', () => { // 12 PM ET is 16:00 UTC
  console.log("⏰ Running daily NBA predictions...");
  runDailyPredictions(client);
});

client.commands.set('bail', {
  async execute(message) {
    const userId = message.author.id;
    const release = prisonUsers.get(userId);

    if (!release || Date.now() > release) {
      return message.reply("✅ You’re not currently in prison.");
    }

    const balance = await getBalance(userId, message.guild.id);
    const cost = Math.floor(balance * 0.3);

    if (balance < cost) {
      return message.reply(`💸 You need at least $${cost} DreamworldPoints to pay bail.`);
    }

    await removeCash(userId, message.guild.id, cost);
    prisonUsers.delete(userId);

    message.reply(`🔓 You paid **$${cost}** bail and escaped prison early.`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const prisonTime = prisonUsers.get(message.author.id);
  if (prisonTime && Date.now() < prisonTime) {
    if (message.channel.name !== 'prison') {
      await message.delete().catch(() => {});
      message.author.send("⛓️ You’re in prison. Only messages in #prison are allowed until you’re released or post bail.");
    }
  }
});

client.commands.set('prisontotal', {
  execute(message) {
    const total = Array.from(prisonBalances.values()).reduce((a, b) => a + b, 0);
    message.channel.send(`🏦 The PrisonBot is holding $${total} DreamworldPoints from recent busts.`);
  }
});

client.commands.set('prison', {
  async execute(message) {
    if (message.channel.name !== 'prison') {
      return message.reply("❌ You can only run this command in the **#prison** channel.");
    }

    const embed = new EmbedBuilder()
      .setTitle('🏚️ Prison Activity Menu')
      .setDescription("Choose your path:\n\n🧪 **Smuggle** — Risky delivery job.\n🐀 **Rat** — Snitch on someone for a quick bag.\n🔥 **Riot** — Chaos with random outcomes.")
      .setColor('#990000')
      .setFooter({ text: 'Prison Quests – Keep your rep alive.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prison_smuggle').setLabel('🧪 Smuggle').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('prison_rat').setLabel('🐀 Rat').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('prison_riot').setLabel('🔥 Riot').setStyle(ButtonStyle.Danger)
    );

    await message.reply({ embeds: [embed], components: [row] });
  }
});

// 📂 !prisonrecord — Shows your prison reputation and titles
client.commands.set('prisonrecord', {
  async execute(message) {
    const userId = message.author.id;

    // Prison data maps
    const ratList = global.prisonRats || new Map();
    const riotFails = global.riotFails || new Map();
    const riotWins = global.riotWins || new Map();
    const smuggleWins = global.smuggleWins || new Map();

    const ratted = ratList.get(userId);
    const failed = riotFails.get(userId) || 0;
    const riots = riotWins.get(userId) || 0;
    const smuggles = smuggleWins.get(userId) || 0;

    // Title Achievements
    const titles = [];
    if (riots >= 3) titles.push("🧨 Riot Lord");
    if (ratted) titles.push("🐀 King Snitch");
    if (smuggles >= 5) titles.push("📦 Cartel Runner");

    const embed = new EmbedBuilder()
      .setTitle(`📂 Prison Record — ${message.author.username}`)
      .setColor('#aa0000')
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: "🐀 Ratted On", value: ratted ? `**${ratted}**` : "`None`", inline: true },
        { name: "🔥 Failed Riots", value: `\`${failed}\``, inline: true },
        { name: "🧨 Successful Riots", value: `\`${riots}\``, inline: true },
        { name: "📦 Smuggle Missions", value: `\`${smuggles}\``, inline: true },
        { name: "🏆 Titles", value: titles.length ? titles.join(" • ") : "`None unlocked yet`", inline: false }
      )
      .setFooter({ text: "Prison tracks everything. Even whispers." })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
});

// 🔥 !breakout — Gang-based rescue mission from prison (requires 10 members & item check)
client.commands.set('breakout', {
  async execute(message) {
    const { isInPrison, clearPrison } = require('./economy/prisonSystem');
    const { getInventory, removeItem } = require('./economy/inventory');
    const gang = gangMap.get(message.author.id);
    const gangMembers = Array.from(gangMap.entries()).filter(([id, name]) => name === gang);
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!isInPrison(userId)) return message.reply("🕳️ You're not locked up.");
    if (!gang || gangMembers.length < 10) return message.reply("🚷 You need a gang of at least 10 members for a breakout.");

    const inv = await getInventory(userId, guildId);
    if ((inv.dynamite || 0) < 1 || (inv.disguise || 0) < 1 || (inv.keycard || 0) < 1) {
      return message.reply("🔒 You need 10x dynamite, 10x disguise, and 10x keycard to attempt a breakout.");
    }

    // Remove required items
    await Promise.all([
      removeItem(userId, guildId, 'dynamite', 10),
      removeItem(userId, guildId, 'disguise', 10),
      removeItem(userId, guildId, 'keycard', 10)
    ]);

    clearPrison(userId);

    const embed = new EmbedBuilder()
      .setTitle("🔥 Breakout Successful!")
      .setDescription(`<@${userId}> was rescued by their gang and escaped prison in a blaze of chaos.`)
      .setColor("#ee4444")
      .setFooter({ text: `Gang: ${gang}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
});


setInterval(async () => {
  const guild = client.guilds.cache.get('1353730054693064816');
  const channel = guild?.channels?.cache.find(c => c.name === 'general');
  if (!channel) return;

  const npc = npcNames[Math.floor(Math.random() * npcNames.length)];
  const drug = drugs[Math.floor(Math.random() * drugs.length)];
  const qty = Math.floor(Math.random() * 4) + 1;
  const total = qty * (drug.base + Math.floor(Math.random() * drug.volatility));

  channel.send(`🧥 **${npc}** just bought **${qty}x ${drug.name}** for **$${total}**.\nStreet prices heating up...`);

  // ✅ Apply price boost directly in MongoDB
  await DealerProfile.updateMany({}, {
    $inc: { [`prices.${drug.id}`]: Math.floor(Math.random() * 30) }
  });
}, Math.floor(Math.random() * 2 * 60 * 1000) + 1200000); // every 2–40 min


client.commands.set('debugdealer', {
  async execute(message) {
    const profile = await DealerProfile.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!profile) return message.reply("No profile found.");

    console.log("DEBUG PROFILE", profile.inventory);
    message.reply("📊 Dealer inventory logged to console.");
  }
});

client.commands.set('debugprofile', {
  async execute(message) {
    const profile = await DealerProfile.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!profile) return message.reply('❌ No profile found.');

    let inventoryDebug = '';
    for (const [k, v] of Object.entries(Object.fromEntries(profile.inventory))) {
      inventoryDebug += `• ${k}: ${v}\n`;
    }

    return message.reply({
      content: `📦 Inventory:\n${inventoryDebug || 'Empty'}\n\nStashUsed: ${profile.stashUsed}\nPrices: ${Object.keys(profile.prices).length}`,
      ephemeral: true
    });
  }
});

client.commands.set('fixdealer', require('./commands/debugFixDealer.js'));


client.commands.set('vouch', {
  async execute(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply("You need to tag someone to vouch.");
    npcNames.forEach(npc => adjustMood(target.id, npc, 2));
    message.channel.send(`🗣️ ${message.author.username} vouched for ${target.username}. NPC trust rising.`);
  }
});

client.commands.set('trash', {
  async execute(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply("You need to tag someone to talk trash about.");
    npcNames.forEach(npc => adjustMood(target.id, npc, -2));
    message.channel.send(`🗑️ ${message.author.username} talked trash about ${target.username}. NPCs watching...`);
  }
});

client.commands.set('drawlottery', {
  async execute(message) {
    if (!message.member.permissions.has('ADMINISTRATOR')) return message.reply("❌ Admins only.");

    const guildId = message.guild.id;

    const tickets = await Ticket.find({ guildId });
    const pool = await Pool.findOne({ guildId });
    const channel = message.channel;

    if (!pool || !tickets.length) return message.reply("No pool or no tickets to draw from.");

    const winnerNum = Math.floor(Math.random() * 50000) + 1;
    let winnerTicket = tickets.find(t => t.number === winnerNum);

    let winner = winnerTicket;
    let wasExact = true;

    if (!winnerTicket) {
      wasExact = false;
      winner = tickets.reduce((closest, curr) => {
        const currDiff = Math.abs(curr.number - winnerNum);
        const closestDiff = Math.abs(closest.number - winnerNum);
        return currDiff < closestDiff ? curr : closest;
      });
    }

    // 💵 Pay the winner
    await addCash(winner.userId, guildId, pool.pool);

    // 💽 Save win
    await LotteryWinner.create({
      userId: winner.userId,
      guildId,
      number: winner.number,
      wonAmount: pool.pool,
      wasExact
    });

    // 🎭 Trigger drama
    sendWinDrama(client, winner.userId, pool.pool);

    await channel.send({
      embeds: [{
        title: '💰 JACKPOT HIT 💰',
        color: 0xFFD700,
        thumbnail: { url: 'https://media.giphy.com/media/l0MYKDrJ0x1lYgMso/giphy.gif' },
        description: `🎉 **${wasExact ? 'Exact Match' : 'Closest Match'}**!\n👤 <@${winner.userId}>\n🎟️ Ticket #: ${winner.number}\n💵 Won: **$${pool.pool}**`,
        footer: { text: 'Dreamworld Weekly Lottery (Manual Draw)' },
        timestamp: new Date()
      }]
    });

    await client.users.fetch(winner.userId).then(async (user) => {
      await user.send(`🎯 You just won the lottery in a manual draw! You won $${pool.pool}.`);
    }).catch(() => {});

    // ♻️ Reset
    await Ticket.deleteMany({ guildId });
    pool.pool = 3000;
    pool.lastDraw = new Date();
    await pool.save();

    // 🧼 Force reload for !lotteryinfo accuracy
    const updatedPool = await Pool.findOne({ guildId });
    console.log('✅ Pool updated to:', updatedPool.pool);
  }
});

client.commands.set('hideouttime', {
  async execute(message) {
    const target = message.mentions.users.first() || message.author;
    const userId = target.id;

    const hideoutEnd = hideoutMap.get(userId);
    const now = Date.now();

    if (!hideoutEnd || hideoutEnd < now) {
      return message.reply(`🔓 <@${userId}> is **not** currently in a hideout. Vulnerable to other players.`);
    }

    return message.reply(`🛡️ <@${userId}> is hiding until <t:${Math.floor(hideoutEnd / 1000)}:R>.`);
  }
});

client.commands.set('buyproperty', {
  async execute(message, args) {
    const Property = require('./economy/propertyModel');
    const DealerProfile = require('./economy/dealerProfileModel');
    const { getBalance, removeCash } = require('./economy/currency');

    const propId = args[0];
    if (!propId) return message.reply("Usage: `!buyproperty <propertyId>`");

    const property = await Property.findOne({ id: propId });
    if (!property) return message.reply("❌ Property not found.");
    if (property.ownerId) return message.reply("🚫 That property is already owned.");

    const balance = await getBalance(message.author.id, message.guild.id);
    if (balance < property.price) return message.reply("💸 Not enough DreamworldPoints.");

    const profile = await DealerProfile.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!profile) return message.reply("❌ No dealer profile found.");

    await removeCash(message.author.id, message.guild.id, property.price);
    property.ownerId = message.author.id;
    property.purchaseDate = new Date();
    await property.save();

    profile.stashCap += property.stashBonus;
    await profile.save();

    message.reply(`🏠 You bought **${property.id}** for $${property.price}. +${property.stashBonus} stash cap!`);
  }
});

client.commands.set('sellproperty', {
  async execute(message) {
    const Property = require('./economy/propertyModel');
    const DealerProfile = require('./economy/dealerProfileModel');
    const { addCash } = require('./economy/currency');

    const owned = await Property.find({ ownerId: message.author.id });

    if (!owned.length) {
      return message.reply("🧱 You don't own any properties to sell.");
    }

    const embed = new EmbedBuilder()
      .setTitle("🏚️ Sell a Property")
      .setDescription("Select which property to sell below.")
      .setColor("#ff4444");

    const rows = [];
    for (const prop of owned.slice(0, 5)) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sell_${prop.id}`)
          .setLabel(`Sell ${prop.id}`)
          .setStyle(ButtonStyle.Danger)
      );
      rows.push(row);
    }

    const msg = await message.reply({ embeds: [embed], components: rows });

    const filter = i => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      const propId = i.customId.split('sell_')[1];
      const property = await Property.findOne({ id: propId });

      if (!property || property.ownerId !== message.author.id) {
        return i.reply({ content: "❌ You can't sell this.", ephemeral: true });
      }

      const refund = Math.floor(property.price * 0.75);
      const profile = await DealerProfile.findOne({ userId: message.author.id, guildId: message.guild.id });

      profile.stashCap -= property.stashBonus;
      await profile.save();

      property.ownerId = null;
      property.purchaseDate = null;
      await property.save();

      await addCash(message.author.id, message.guild.id, refund);
      await i.reply({ content: `🏦 You sold **${propId}** for $${refund}. -${property.stashBonus} stash cap.`, ephemeral: true });

      // Remove the button after sale
      const updatedRows = msg.components.map(row => {
        return new ActionRowBuilder().addComponents(
          row.components.map(btn => {
            if (btn.customId === `sell_${propId}`) {
              return ButtonBuilder.from(btn).setDisabled(true).setLabel("Sold");
            }
            return btn;
          })
        );
      });

      await msg.edit({ components: updatedRows });
    });

    collector.on('end', () => msg.edit({ components: [] }));
  }
});


client.commands.set('myproperties', {
  async execute(message) {
    const Property = require('./economy/propertyModel');

    const owned = await Property.find({ ownerId: message.author.id });
    if (!owned.length) {
      return message.reply("🏚️ You don't own any properties yet.");
    }

    const itemsPerPage = 5;
    let page = 0;

    const generateEmbed = (page) => {
      const start = page * itemsPerPage;
      const currentProps = owned.slice(start, start + itemsPerPage);
      const listings = currentProps.map(p =>
        `🏠 **${p.id}** (${p.area} - ${p.tier})\n💰 $${p.price} — +${p.stashBonus} stash\n🗓️ Bought: <t:${Math.floor(p.purchaseDate.getTime() / 1000)}:R>`
      ).join('\n\n');

      return new EmbedBuilder()
        .setTitle(`📜 Your Properties — Page ${page + 1}/${Math.ceil(owned.length / itemsPerPage)}`)
        .setDescription(listings)
        .setColor("#ffd166")
        .setFooter({ text: "You earn passive income from hideouts." });
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev_page').setLabel('⏮️ Prev').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('next_page').setLabel('⏭️ Next').setStyle(ButtonStyle.Primary)
    );

    const msg = await message.reply({ embeds: [generateEmbed(page)], components: [row] });

    const filter = i => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'next_page') {
        if ((page + 1) * itemsPerPage < owned.length) page++;
      } else if (i.customId === 'prev_page') {
        if (page > 0) page--;
      }
      await i.update({ embeds: [generateEmbed(page)], components: [row] });
    });

    collector.on('end', () => {
      msg.edit({ components: [] });
    });
  }
});


client.commands.set('listproperties', {
  async execute(message) {
    const Property = require('./economy/propertyModel');
    const DealerProfile = require('./economy/dealerProfileModel');
    const { getBalance, removeCash } = require('./economy/currency');

    const properties = await Property.find({ ownerId: null });

    if (!properties.length) {
      return message.reply("🎉 All properties have been claimed!");
    }

    const itemsPerPage = 5;
    let page = 0;

    const generateEmbed = (page) => {
      const start = page * itemsPerPage;
      const currentProps = properties.slice(start, start + itemsPerPage);
      const listings = currentProps.map((p, i) =>
        `🏠 **${p.id}** (${p.area} - ${p.tier})\n💰 $${p.price} — +${p.stashBonus} stash`
      ).join('\n\n');

      return new EmbedBuilder()
        .setTitle(`🏡 Available Properties — Page ${page + 1}/${Math.ceil(properties.length / itemsPerPage)}`)
        .setDescription(listings)
        .setColor("#33cc99")
        .setFooter({ text: "Click a button below to purchase a property." });
    };

    const generateButtons = (page) => {
      const start = page * itemsPerPage;
      const currentProps = properties.slice(start, start + itemsPerPage);

      const row1 = new ActionRowBuilder();
      currentProps.forEach((prop, i) => {
        row1.addComponents(
          new ButtonBuilder()
            .setCustomId(`buy_${prop.id}`)
            .setLabel(`Buy ${prop.id}`)
            .setStyle(ButtonStyle.Success)
        );
      });

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_page').setLabel('⏮️ Prev').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('next_page').setLabel('⏭️ Next').setStyle(ButtonStyle.Primary)
      );

      return [row1, row2];
    };

    const msg = await message.reply({
      embeds: [generateEmbed(page)],
      components: generateButtons(page)
    });

    const filter = i => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'next_page') {
        if ((page + 1) * itemsPerPage < properties.length) page++;
        await i.update({ embeds: [generateEmbed(page)], components: generateButtons(page) });
        return;
      }

      if (i.customId === 'prev_page') {
        if (page > 0) page--;
        await i.update({ embeds: [generateEmbed(page)], components: generateButtons(page) });
        return;
      }

      // Handle BUY action
      if (i.customId.startsWith('buy_')) {
        const propId = i.customId.split('buy_')[1];
        const prop = await Property.findOne({ id: propId });
        if (!prop) return i.reply({ content: '❌ Property not found.', ephemeral: true });
        if (prop.ownerId) return i.reply({ content: '🚫 Property already sold.', ephemeral: true });

        const balance = await getBalance(i.user.id, i.guildId);
        if (balance < prop.price) {
          return i.reply({ content: `💸 You need $${prop.price} to buy this property.`, ephemeral: true });
        }

        await removeCash(i.user.id, i.guildId, prop.price);
        prop.ownerId = i.user.id;
        prop.purchaseDate = new Date();
        await prop.save();

        const profile = await DealerProfile.findOne({ userId: i.user.id, guildId: i.guildId });
        profile.stashCap += prop.stashBonus;
        await profile.save();

        await i.reply({ content: `🎉 You bought **${prop.id}** for $${prop.price}! +${prop.stashBonus} stash cap.`, ephemeral: true });

        // Refresh data after purchase
        properties.splice(properties.findIndex(p => p.id === propId), 1);
        await msg.edit({ embeds: [generateEmbed(page)], components: generateButtons(page) });
      }
    });

    collector.on('end', () => {
      msg.edit({ components: [] });
    });
  }
});

client.commands.set('landlords', {
  async execute(message) {
    const Property = require('./economy/propertyModel');
    const grouped = await Property.aggregate([
      { $match: { ownerId: { $ne: null } } },
      { $group: { _id: '$ownerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    if (!grouped.length) {
      return message.reply("📉 No landlords found.");
    }

    const leaderboard = await Promise.all(
      grouped.map(async (entry, i) => {
        const user = await message.guild.members.fetch(entry._id).catch(() => null);
        const name = user ? user.displayName : `Unknown User (${entry._id})`;
        return `#${i + 1} — **${name}** owns **${entry.count}** properties`;
      })
    );

    const embed = new EmbedBuilder()
      .setTitle("🏆 Top 10 Landlords")
      .setDescription(leaderboard.join('\n'))
      .setColor("#ffaa00");

    message.channel.send({ embeds: [embed] });
  }
});

// 🔥 !burn @user — Attempt to burn one of their properties
client.commands.set('burn', {
  async execute(message) {
    const Property = require('./economy/propertyModel');
    const { getInventory, removeItem } = require('./economy/inventory');
    const { addHeat } = require('./economy/heatSystem');
    const { getPlayerStats } = require('./economy/statSystem');
    const DealerProfile = require('./economy/dealerProfileModel');

    const targetUser = message.mentions.users.first();
    const attackerId = message.author.id;
    const guildId = message.guild.id;

    if (!targetUser || targetUser.id === attackerId) {
      return message.reply('❌ Mention someone to burn down their property (not yourself).');
    }

    const targetProperties = await Property.find({ ownerId: targetUser.id });
    if (!targetProperties.length) {
      return message.reply('🏚️ That user has no properties to burn.');
    }

    const inv = await getInventory(attackerId, guildId);
    if ((inv.gas || 0) < 1 || (inv.skull || 0) < 1) {
      return message.reply('🧪 You need 1x gas and 1x skull to attempt this.');
    }

    const stats = getPlayerStats(attackerId, guildId);
    const targetProfile = await DealerProfile.findOne({ userId: targetUser.id, guildId });

    // Choose random property early to check if it's fortified
    const chosenProp = targetProperties[Math.floor(Math.random() * targetProperties.length)];
    if (chosenProp.fortifiedUntil && new Date(chosenProp.fortifiedUntil) > new Date()) {
      return message.reply("🛡️ That property is currently fortified and can't be burned.");
    }

    // Burn chance logic
    const chance = 30 + stats.grit * 2 + stats.luck * 2 - (targetProfile?.vitality || 0) * 2;
    const roll = Math.floor(Math.random() * 100);

    await removeItem(attackerId, guildId, 'gas', 1);
    await removeItem(attackerId, guildId, 'skull', 1);

    if (roll < chance) {
      const stashLoss = chosenProp.stashBonus;

      const targetDealer = await DealerProfile.findOne({ userId: targetUser.id, guildId });
      if (targetDealer) {
        targetDealer.stashCap = Math.max(0, targetDealer.stashCap - stashLoss);
        await targetDealer.save();
      }

      await Property.deleteOne({ id: chosenProp.id });

      message.channel.send(`🔥 <@${attackerId}> successfully burned down **${chosenProp.id}** owned by <@${targetUser.id}>! -${stashLoss} stash bonus.`);
    } else {
      await addHeat(attackerId, guildId, 10);
      message.channel.send(`🚨 <@${attackerId}> tried to burn <@${targetUser.id}>'s property... but FAILED and triggered a bounty! 🔥`);
    }
  }
});

client.commands.set('burnlog', {
  async execute(message) {
    try {
      const { EmbedBuilder } = require('discord.js');
      const Drama = require('./economy/drama'); // Ensure this path is correct

      const logs = await Drama.find({ type: 'burn' }).sort({ date: -1 }).limit(10);

      if (!logs.length) {
        return message.reply("🔥 No recent burn activity.");
      }

      const embed = new EmbedBuilder()
        .setTitle("🔥 Recent Burn Events")
        .setColor("#cc0000")
        .setDescription(
          logs.map(log => `• ${log.message} (<t:${Math.floor(new Date(log.date).getTime() / 1000)}:R>)`).join('\n')
        );

      message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Error fetching burn logs:", err);
      message.reply("❌ Something went wrong while retrieving the burn log.");
    }
  }
});


// 🚨 !riot — Attempt to trigger a prison riot (risky XP gain)
client.commands.set('riot', {
  async execute(message) {
    const { isInPrison, sendToPrison } = require('./economy/prisonSystem');
    const { addXp } = require('./economy/xp');
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!isInPrison(userId)) return message.reply("🕳️ You're not in prison.");

    const chance = Math.random();
    const embed = new EmbedBuilder().setTimestamp();

    if (chance < 0.4) {
      const xp = Math.floor(Math.random() * 40 + 20);
      await addXp(userId, guildId, xp);

      embed.setTitle("🔥 Riot Success!")
        .setDescription(`Chaos erupts inside the walls... <@${userId}> gained **${xp} XP** from the riot.`)
        .setColor("#ff8800");

      // ✅ Broadcast to another channel
      const channelId = '1353730054693064819'; // Replace with your target channel ID
      const riotChannel = message.client.channels.cache.get(channelId);
      if (riotChannel) {
        const broadcastEmbed = new EmbedBuilder()
          .setTitle("🔥 Prison Riot Escalating!")
          .setDescription(`🚨 Inmate **${message.author.username}** is inciting chaos behind bars.\nSecurity may be compromised across the entire server...`)
          .setColor("#ff2222")
          .setThumbnail(message.author.displayAvatarURL())
          .setFooter({ text: "Riot feed monitored by Warden Systems" })
          .setTimestamp();

        riotChannel.send({ embeds: [broadcastEmbed] });
      }

    } else {
      await sendToPrison(userId, guildId); // Reset timer as punishment

      embed.setTitle("🚔 Riot Failed!")
        .setDescription("You were caught and sent to solitary confinement. Your prison timer was reset.")
        .setColor("#5555ff");
    }

    message.channel.send({ embeds: [embed] });
  }
});


// 🐀 !rat — Snitch on another inmate for rewards (randomly targets anyone in prison)
client.commands.set('rat', {
  async execute(message) {
    const { isInPrison, prisonUsers } = require('./economy/prisonSystem');
    const { addCash } = require('./economy/currency');
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!isInPrison(userId)) return message.reply("🕳️ You're not in prison.");

    const targets = Array.from(prisonUsers.keys()).filter(id => id !== userId);
    if (!targets.length) return message.reply("🐁 Nobody left to rat on.");

    const snitchedId = targets[Math.floor(Math.random() * targets.length)];
    const reward = Math.floor(Math.random() * 150 + 100);

    await addCash(userId, guildId, reward);
    const embed = new EmbedBuilder()
      .setTitle("🐀 You Snitched!")
      .setDescription(`You ratted out <@${snitchedId}> and earned **$${reward}**.
Word spreads quickly in the yard... Watch your back.`)
      .setColor("#aaaa00")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
});

// 🚬 !smuggle — Risk item or XP loss in exchange for high reward
client.commands.set('smuggle', {
  async execute(message) {
    const { isInPrison } = require('./economy/prisonSystem');
    const { addCash } = require('./economy/currency');
    const { addXp } = require('./economy/xp');
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!isInPrison(userId)) return message.reply("🕳️ You're not in prison.");

    const chance = Math.random();
    const embed = new EmbedBuilder().setTimestamp();

    if (chance < 0.3) {
      const xpLoss = Math.floor(Math.random() * 40 + 20);
      await addXp(userId, guildId, -xpLoss);
      embed.setTitle("🚫 Smuggle Failed!")
        .setDescription(`Your stash was searched. You lost **${xpLoss} XP** during intake.`)
        .setColor("#dd4444");
    } else {
      const payout = Math.floor(Math.random() * 400 + 200);
      await addCash(userId, guildId, payout);
      embed.setTitle("📦 Smuggle Success!")
        .setDescription(`You snuck in contraband and earned **$${payout}**. Well played.`)
        .setColor("#44cc44");
    }

    message.channel.send({ embeds: [embed] });
  }
});

// 💸 !paybail — Pay 30% of your cash to exit prison early
client.commands.set('paybail', {
  async execute(message) {
    const { isInPrison, clearPrison } = require('./economy/prisonSystem');
    const { getBalance, removeCash } = require('./economy/currency');
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!isInPrison(userId)) return message.reply("🔓 You’re not locked up.");

    const balance = await getBalance(userId, guildId);
    const cost = Math.floor(balance * 0.3);

    if (balance < cost) return message.reply("💰 You don’t have enough to pay bail.");

    await removeCash(userId, guildId, cost);
    clearPrison(userId);

    const embed = new EmbedBuilder()
      .setTitle("🪙 Bail Paid!")
      .setDescription(`You paid **$${cost}** and walked free. The guards never looked back.`)
      .setColor("#dddd44")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
});

client.commands.set('lawyer', {
  async execute(message) {
    const { retainLawyer, hasLawyer, riotFails, clearPrison } = require('./economy/prisonSystem');
    const { getBalance, removeCash } = require('./economy/currency');
    const userId = message.author.id;
    const guildId = message.guild.id;

    const balance = await getBalance(userId, guildId);
    const cost = 15000;

    if (balance < cost) return message.reply("💰 You need $15,000 to retain legal counsel.");

    await removeCash(userId, guildId, cost);
    retainLawyer(userId, 1);

    // 👨‍⚖️ Simulate courtroom animation
    const courtEmbed = new EmbedBuilder()
      .setTitle("👨‍⚖️ Court in Session")
      .setDescription("The judge is reviewing your record...")
      .setColor("#4444aa")
      .setFooter({ text: "Verdict will be delivered in 60 seconds..." })
      .setTimestamp();

      let progressBar;
      try {
        progressBar = await message.channel.send({ embeds: [courtEmbed] });
      } catch (err) {
        console.error('❌ Failed to send court embed:', err);
        return;
      }
      try {
        await progressBar.edit({ embeds: [courtEmbed] });
      } catch (err) {
        console.warn('⚠️ Lawyer embed update failed:', err.code);
        clearInterval(interval); // Prevent runaway loop
      }
      

    let progress = 0;
    const totalSteps = 10;
    const interval = setInterval(async () => {
      progress++;
      const bar = "🟦".repeat(progress) + "⬜".repeat(totalSteps - progress);

      courtEmbed.setDescription(`The judge is reviewing your record...\n\n\`${bar}\``);
      await progressBar.edit({ embeds: [courtEmbed] });

      if (progress === totalSteps) {
        clearInterval(interval);

        const fails = riotFails.get(userId) || 0;
        const verdict = (hasLawyer(userId) && fails >= 3 && Math.random() < 0.9)
          ? 'not guilty'
          : 'guilty';

        const finalEmbed = new EmbedBuilder()
          .setTitle(verdict === 'not guilty' ? "✅ Verdict: Not Guilty" : "❌ Verdict: Guilty")
          .setDescription(
            verdict === 'not guilty'
              ? `Your lawyer worked their magic. <@${userId}> beat the case and walked free.`
              : `The courtroom went silent... <@${userId}> was found guilty and sent back to prison.`
          )
          .setColor(verdict === 'not guilty' ? "#33cc66" : "#cc3344")
          .setThumbnail(message.author.displayAvatarURL())
          .setFooter({ text: verdict === 'not guilty' ? "Case dismissed." : "Sentence enforced." })
          .setTimestamp();

        await progressBar.edit({ embeds: [finalEmbed] });

        if (verdict === 'not guilty') {
          clearPrison(userId);
          global.lawyerWins = global.lawyerWins || new Map();
          const wins = global.lawyerWins.get(userId) || 0;
          global.lawyerWins.set(userId, wins + 1);
        } else {
          global.lawyerFails = global.lawyerFails || new Map();
          const fails = global.lawyerFails.get(userId) || 0;
          global.lawyerFails.set(userId, fails + 1);
        }
        
      }
    }, 6000); // 10 steps = 60 seconds
  }
});

// 📁 !casefile — View your lawyer win/loss record
client.commands.set('casefile', {
  async execute(message) {
    const userId = message.author.id;
    const winMap = global.lawyerWins || new Map();
    const lossMap = global.lawyerFails || new Map();

    const wins = winMap.get(userId) || 0;
    const losses = lossMap.get(userId) || 0;
    const total = wins + losses;
    const rate = total > 0 ? Math.round((wins / total) * 100) : 0;

    const embed = new EmbedBuilder()
      .setTitle(`📁 Casefile — ${message.author.username}`)
      .setColor('#ffee88')
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: "✅ Wins", value: `\`${wins}\``, inline: true },
        { name: "❌ Losses", value: `\`${losses}\``, inline: true },
        { name: "⚖️ Win Rate", value: `\`${rate}%\``, inline: true }
      )
      .setFooter({ text: "Legal stats tracked by Dreamworld Court Network" })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
});

client.commands.set('gamble', gambleCommand);

//Debug Gang
client.commands.set('mygang', {
  async execute(message) {
    const user = await Currency.findOne({ userId: message.author.id, guildId: message.guild.id });
    return message.reply(`Gang: ${user?.gang || 'None'}`);
  }
});

//Leave
client.commands.set("gangleave", {
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    const user = await Currency.findOne({ userId, guildId });
    if (!user || !user.gang) {
      return message.reply("❌ You are not in a gang.");
    }

    const gangKey = user.gang;
    const gang = gangs[gangKey];

    // 🗑️ Remove gang from DB
    user.gang = null;
    await user.save();

    // 🧼 Remove role from Discord
    const member = await message.guild.members.fetch(userId).catch(() => null);
    const role = message.guild.roles.cache.find(r => r.name === gang.name);

    if (member && role && member.roles.cache.has(role.id)) {
      await member.roles.remove(role).catch(() => {});
    }

    // 🔔 Confirmation message
    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚪 Gang Left")
          .setDescription(`You have left **${gang.icon} ${gang.name}**. Gang bonus removed.`)
          .setColor("#999999")
          .setTimestamp()
      ]
    });
  }
});

client.commands.set('testmule', {
  async execute(message, args, client) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply("❌ Only server admins can use this command.");
    }

    const DealerProfile = require('./economy/dealerProfileModel');
    const { trySpawnMule } = require('./events/npc/npcMules');
    const guildId = message.guild.id;
    const userId = message.author.id;

    const profile = await DealerProfile.findOne({ userId, guildId });
    if (!profile || !profile.inventory) {
      console.log(`[TEST MULE] ❌ No stash found for ${message.author.username}`);
      return message.reply("❌ No stash found to test mule spawn.");
    }

    const inventory = profile.inventory instanceof Map
      ? Object.fromEntries(profile.inventory)
      : profile.inventory;

    const stashCount = Object.values(inventory).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
    console.log(`[TEST MULE] Admin=${message.author.username} stashCount=${stashCount}`);
    console.log(`[TEST MULE] Inventory:`, inventory);

    try {
      await trySpawnMule(userId, guildId, inventory, message.channel);
      message.reply('🐫 Testing mule...');
    } catch (err) {
      console.error('[TEST MULE ERROR]', err);
      message.reply('❌ Mule spawn failed. Check logs for details.');
    }
  }
});


client.commands.set('buydog', {
  async execute(message) {
    const breeds = [
      { id: 'pitbull', label: '🐕 Pitbull ($10,000)', cost: 10000 },
      { id: 'shepherd', label: '🐺 Shepherd ($15,000)', cost: 15000 },
      { id: 'pomeranian', label: '🐩 Pomeranian ($25,000)', cost: 25000 }
    ];

    const row = new ActionRowBuilder().addComponents(
      breeds.map(breed =>
        new ButtonBuilder()
          .setCustomId(`buydog_${breed.id}`)
          .setLabel(breed.label)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const embed = new EmbedBuilder()
      .setTitle("🐶 Adopt a Guard Dog")
      .setDescription("Pick a breed below to guard your stash!")
      .setColor("#ffcc00")
      .setFooter({ text: "Each dog has unique traits. Only 1 dog defends at a time." });

    return message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.commands.set('mydog', {
  async execute(message) {
    const profile = await DogProfile.findOne({ userId: message.author.id, guildId: message.guild.id });

    if (!profile) {
      return message.reply("🐕 You don't have a dog yet!");
    }

    const embed = new EmbedBuilder()
      .setTitle("🐾 Your Dog")
      .setDescription(`Name: **${profile.name}**\nBreed: **${profile.breed}**\nMood: **${profile.mood || "Neutral"}**`)
      .setColor('#f5c542');

    await message.reply({ embeds: [embed] });
  }
});


client.commands.set('healdog', {
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const dog = dogMap.get(userId);
    if (!dog) return message.reply("❌ You don't have a dog.");

    const cost = 5000;
    const balance = await getBalance(userId, guildId);
    if (balance < cost) return message.reply("💸 Not enough to heal your dog.");

    await removeCash(userId, guildId, cost);
    dog.hp = 100;
    dogMap.set(userId, dog);

    return message.reply("🐶 Your dog is fully healed and ready to bite.");
  }
});

client.commands.set('namedog', namedog);
client.commands.set('mydog', mydog);
client.commands.set('feeddog', require('./commands/feeddog'));
client.commands.set('feeddog', feeddog);


client.commands.set('disown', {
  async execute(message) {
    const dog = await DogProfile.findOne({ userId: message.author.id, guildId: message.guild.id });

    if (!dog) {
      return message.reply("❌ You don't have a dog to disown.");
    }

    const embed = new EmbedBuilder()
      .setTitle(`🐶 Stray Dog: ${dog.name || 'Unnamed'}`)
      .setDescription(`**Breed:** ${dog.breed}\n**Level:** ${dog.level}\n**HP:** ${dog.hp}\n\nAdopt this stray before it disappears!`)
      .setColor('#ffaa00');

      const dogPic = getDogImage(dog.breed, dog.level);
      if (dogPic) {
        embed.setThumbnail(dogPic);
      }
      

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`adopt_stray_${dog._id}`)
        .setLabel('🐾 Adopt Dog')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`recover_stray_${dog._id}`)
        .setLabel('❤️ Recover My Dog')
        .setStyle(ButtonStyle.Primary)
    );

    const strayMessage = await message.channel.send({ embeds: [embed], components: [row] });

    strayDogs.set(dog._id.toString(), {
      dog,
      ownerId: message.author.id,
      messageId: strayMessage.id,
      channelId: strayMessage.channel.id,
      timeout: setTimeout(async () => {
        const strayInfo = strayDogs.get(dog._id.toString());
        if (strayInfo) {
          await DogProfile.deleteOne({ _id: dog._id });

          const lostEmbed = EmbedBuilder.from(embed)
            .setTitle(`🥀 Dog Lost Forever`)
            .setDescription(`Nobody adopted **${dog.name}**.\nThe dog has disappeared into the wild...`)
            .setColor('#555555');

          const channel = await message.guild.channels.fetch(strayInfo.channelId);
          const msg = await channel.messages.fetch(strayInfo.messageId);
          await msg.edit({ embeds: [lostEmbed], components: [] });

          strayDogs.delete(dog._id.toString());
        }
      }, 10 * 60 * 1000) // 10 minutes
    });

    // 🛎️ BONUS: Broadcast stray dog alert
    await message.channel.send(`📢 **A stray dog has appeared!** First to adopt gets it! 🐾`);
  }
});

client.commands.set('giveitem', {
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply("❌ Only admins can use this command.");
    }

    const { addItem } = require('./economy/inventory');
    const { items } = require('./economy/items');

    const itemId = args[0];
    const amount = parseInt(args[1]) || 1;

    if (!itemId) {
      return message.reply("❌ You must specify an item ID.");
    }

    const item = items.find(i => i.id === itemId);
    if (!item) {
      return message.reply(`❌ No item found with ID: **${itemId}**.`);
    }

    await addItem(message.author.id, message.guildId, itemId, amount);

    return message.reply(`✅ Gave you **${amount}x ${item.name}**!`);
  }
});

// 📦 Admin-only Bulk Buyer Test
client.commands.set('testbulkbuyer', {
  async execute(message) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply({ content: "❌ Admins only.", ephemeral: true });
    }

    const userId = message.author.id;
    const guildId = message.guild.id;

    try {
      await spawnBulkBuyer(client, userId, guildId, message.channel);
      await message.reply({ content: "✅ Bulk Buyer test triggered.", ephemeral: true });
    } catch (err) {
      console.error("❌ Error triggering testbulkbuyer:", err);
      await message.reply({ content: "❌ Failed to spawn bulk buyer.", ephemeral: true });
    }
  }
});

// Job
client.commands.set('job', { 
  async execute(message) {
    console.log("✅ Running !job command");

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
    const JobProfile = require('./models/JobProfile');
    const userId = message.author.id;
    const guildId = message.guild.id;

    const jobOptions = [
      { id: 'barista', name: '☕ Barista', basePay: 4600, interval: 15, promo: '$5K → $18K' },
      { id: 'guard', name: '🛡️ Security Guard', basePay: 5000, interval: 18, promo: '$6K → $20K' },
      { id: 'clerk', name: '🗃️ Clerk', basePay: 5200, interval: 14, promo: '$6K → $21K' },
      { id: 'delivery', name: '📦 Delivery Driver', basePay: 4800, interval: 16, promo: '$5.5K → $19K' },
      { id: 'bartender', name: '🍸 Bartender', basePay: 4700, interval: 12, promo: '$5K → $17K' },
      { id: 'cook', name: '🍳 Line Cook', basePay: 4900, interval: 13, promo: '$5.5K → $18.5K' },
    ];

    const existing = await JobProfile.findOne({ userId, guildId });
    if (existing) {
      return message.reply("👔 You already have a job. Use `!clockin` to start work.");
    }

    const rows = [];
    for (let i = 0; i < jobOptions.length; i += 3) {
      const buttons = jobOptions.slice(i, i + 3).map(j =>
        new ButtonBuilder()
          .setCustomId(`pick_job_${j.id}`)
          .setLabel(j.name)
          .setStyle(ButtonStyle.Primary)
      );
      rows.push(new ActionRowBuilder().addComponents(buttons));
    }

    const jobList = jobOptions.map(j =>
      `**${j.name}**\n> Base Pay: \`$${j.basePay.toLocaleString()}\`\n> Promo Range: \`${j.promo}\`\n`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle("💼 Choose a Job")
      .setDescription("Pick a job to begin earning passive income.\nYou’ll unlock promotions over time.\n\n" + jobList)
      .setColor('#00aa88');

    const msg = await message.channel.send({ embeds: [embed], components: rows });

    const collector = msg.createMessageComponentCollector({ time: 30000 });
    collector.on('collect', async interaction => {
      if (interaction.user.id !== userId) return;

      const jobId = interaction.customId.split('_')[2];
      const selected = jobOptions.find(j => j.id === jobId);
      if (!selected) {
        return interaction.reply({ content: "❌ Invalid job selected.", ephemeral: true });
      }

      await JobProfile.create({
        userId,
        guildId,
        jobId,
        jobName: selected.name,
        basePay: selected.basePay,
        interval: selected.interval
      });

      await interaction.reply({
        content: `✅ You are now a **${selected.name}**.\nUse \`!clockin\` to begin working.`,
        ephemeral: true
      });
    });
  }
});


client.commands.set('clockin', {
  async execute(message) {
    console.log(`[${new Date().toISOString()}] ✅ Running !clockin for ${message.author.tag}`);

    try {
      const JobProfile = require('./models/JobProfile');
      const { addCash } = require('./economy/currency');
      const { appendXp } = require('./economy/xpRewards');
      const { EmbedBuilder } = require('discord.js');

      const userId = message.author.id;
      const guildId = message.guild.id;

      let profile = await JobProfile.findOne({ userId, guildId });
      if (!profile) {
        console.log(`❌ No job profile found for ${userId}`);
        return message.reply("❌ You don’t have a job yet. Use `!job` to get started.");
      }

      const now = new Date();
      const cooldownUntil = profile.cooldownUntil ? new Date(profile.cooldownUntil).getTime() : 0;

      if (profile.clockedIn && cooldownUntil > now.getTime()) {
        const remainingMs = cooldownUntil - now.getTime();
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);
        console.log(`⏳ ${userId} is still working, ${minutes}m ${seconds}s left`);
        return message.reply(`⏳ You're still working! Come back in **${minutes}m ${seconds}s**.`);
      }

      const base = profile.basePay || 5000;
      const maxMultiplier = 5.0;
      const levelMultiplier = Math.min(1 + (profile.level - 1) * 0.05, maxMultiplier);
      const payout = Math.floor(base * levelMultiplier);
      const interval = profile.interval || 15;
      const msUntilDone = interval * 60000;
      const nextTime = new Date(now.getTime() + msUntilDone);
      const progressBar = '🟩'.repeat(1) + '⬛'.repeat(9);

      profile.clockedIn = true;
      profile.lastClockIn = now;
      profile.cooldownUntil = nextTime;
      profile.totalEarned += payout;
      profile.timesWorked += 1;
      await profile.save();
      console.log(`⏰ ${userId} clocked in as ${profile.jobName}, earning $${payout} in ${interval} minutes`);

      let promoted = false;
      const promoteEvery = 5;
      const maxLevel = 10;

      if (profile.level < maxLevel && profile.timesWorked % promoteEvery === 0) {
        profile.level += 1;
        promoted = true;
        await appendXp(userId, guildId, 50);
        await profile.save();
        console.log(`🎉 ${userId} promoted to Level ${profile.level}`);

        const promoEmbed = new EmbedBuilder()
          .setTitle("🔺 PROMOTED!")
          .setDescription(`🎉 <@${userId}> was promoted to **Level ${profile.level}** as a **${profile.jobName}**!\nThey now earn **$${Math.floor(profile.basePay * levelMultiplier).toLocaleString()}** per shift.`)
          .setColor('#ff3366')
          .setThumbnail(message.author.displayAvatarURL())
          .setFooter({ text: "Keep grinding. Promotions await." })
          .setTimestamp();

        await message.channel.send({ embeds: [promoEmbed] });

        try {
          const user = await message.client.users.fetch(userId);
          await user.send(`📈 Congrats! You've been **promoted to Level ${profile.level}** as a **${profile.jobName}**!`);
          console.log(`📨 Promotion DM sent to ${userId}`);
        } catch (err) {
          console.warn(`⚠️ Could not DM promotion to ${userId}: ${err.message}`);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`💼 Clocked In as ${profile.jobName}`)
        .setDescription([
          `**Level:** ${profile.level}`,
          `**Pay Rate:** $${payout.toLocaleString()}`,
          `**Next Pay In:** ${interval} minutes`,
          '',
          `${progressBar}`,
        ].join('\n'))
        .setColor(promoted ? '#ff9933' : '#ffa600')
        .setFooter({ text: 'You’ll be paid after the timer ends.' });

      await message.reply({ embeds: [embed] });

      setTimeout(async () => {
        const updated = await JobProfile.findOne({ userId, guildId });
        if (!updated) {
          console.warn(`⚠️ Job profile vanished for ${userId}`);
          return;
        }

        updated.clockedIn = false;
        await updated.save();

        const finalPayout = Math.floor((updated.basePay || 5000) * Math.min(1 + (updated.level - 1) * 0.05, maxMultiplier));
        await addCash(userId, guildId, finalPayout);
        console.log(`💰 ${userId} paid $${finalPayout} after shift as ${updated.jobName}`);

        try {
          const user = await message.client.users.fetch(userId);
          await user.send(`🤑 You’ve finished your shift as a **${updated.jobName}** and earned **$${finalPayout.toLocaleString()}**!\nUse \`!clockin\` to go back to work.`);
          console.log(`📩 Payout DM sent to ${userId}`);
        } catch (err) {
          console.warn(`❌ Could not DM final payout to ${userId}: ${err.message}`);
        }
      }, msUntilDone);
    } catch (err) {
      console.error(`❌ Error in !clockin:`, err);
      return message.reply('⚠️ Something went wrong while trying to clock you in.');
    }
  }
});



client.commands.set('jobleaderboard', {
  async execute(message) {
    console.log("✅ Running !jobleaderboard");

    const JobProfile = require('./models/JobProfile');
    const JobLeaderboard = require('./models/jobLeaderboardModel');
    const guildId = message.guild.id;

    const allTime = await JobProfile.find({ guildId }).sort({ totalEarned: -1 }).limit(10);
    const thisMonth = await JobLeaderboard.find({ guildId, month: new Date().toISOString().slice(0, 7) })
      .sort({ earnedThisMonth: -1 }).limit(10);

    const formatUser = async (entry, i, field = 'totalEarned') => {
      const user = await message.client.users.fetch(entry.userId).catch(() => null);
      const name = user ? user.username : "Unknown";
      const jobInfo = entry.jobName ? ` (${entry.jobName}, L${entry.level || 1})` : '';
      const amount = entry[field] || 0;
      return `\`${i + 1}.\` **${name}**${jobInfo} — $${amount.toLocaleString()}`;
    };

    const allTimeText = await Promise.all(allTime.map((e, i) => formatUser(e, i, 'totalEarned')));
    const monthText = await Promise.all(thisMonth.map((e, i) => formatUser(e, i, 'earnedThisMonth')));

    const embed = new EmbedBuilder()
      .setTitle("🏆 Employee Leaderboard")
      .addFields(
        { name: "👑 All-Time Earners", value: allTimeText.join('\n') || "No data yet." },
        { name: `🗓️ ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`, value: monthText.join('\n') || "No data yet." }
      )
      .setColor('#33cc99')
      .setFooter({ text: "Promote or perish." })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
});


client.commands.set('jobstats', {
  async execute(message) {
    console.log("✅ Running !jobstats");

    const JobProfile = require('./models/JobProfile');
    const profile = await JobProfile.findOne({ userId: message.author.id, guildId: message.guild.id });

    if (!profile) return message.reply("❌ You don’t have a job. Use `!job` to pick one.");

    const now = new Date();
    const remaining = profile.cooldownUntil ? Math.max(0, Math.ceil((profile.cooldownUntil - now) / 60000)) : 0;
    const ready = remaining <= 0 ? '✅ Ready to work!' : `⏳ Cooldown: ${remaining} min`;

    const levelMultiplier = Math.min(1 + (profile.level - 1) * 0.05, 5.0);
    const payPerShift = Math.floor((profile.basePay || 0) * levelMultiplier);

    const embed = new EmbedBuilder()
      .setTitle(`💼 ${profile.jobName || 'Unknown'} Stats`)
      .addFields(
        { name: "Level", value: `${profile.level || 1}`, inline: true },
        { name: "Pay Per Shift", value: `$${payPerShift.toLocaleString()}`, inline: true },
        { name: "Work Interval", value: `${profile.interval || 15} min`, inline: true },
        { name: "Total Earned", value: `$${(profile.totalEarned || 0).toLocaleString()}`, inline: true },
        { name: "Shifts Worked", value: `${profile.timesWorked || 0}`, inline: true },
        { name: "Status", value: ready, inline: false }
      )
      .setThumbnail(message.author.displayAvatarURL())
      .setColor('#3399ff')
      .setFooter({ text: "Grind smarter. Promotions await." })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
});



client.commands.set('quitjob', {
  async execute(message) {
    const JobProfile = require('./models/JobProfile');
    const userId = message.author.id;
    const guildId = message.guild.id;

    const profile = await JobProfile.findOne({ userId, guildId });
    if (!profile) {
      return message.reply("❌ You don't have a job to quit.");
    }

    const embed = new EmbedBuilder()
      .setTitle("😢 Resignation Accepted")
      .setDescription(`You've quit your job as a **${profile.jobName}**.\nYou can choose a new job anytime with \`!job\`.`)
      .setColor('#888888')
      .setFooter({ text: 'All promotions and earnings are reset.' })
      .setTimestamp();

    await JobProfile.deleteOne({ userId, guildId });

    return message.reply({ embeds: [embed] });
  }
});

client.commands.set('farm', {
  async execute(message) {
    console.log("✅ Running !farm");

    const Plant = require('./models/PlantModel');
    const { addItem, removeItem, getInventory } = require('./economy/inventory');
    const userId = message.author.id;
    const guildId = message.guild.id;

    const seedOptions = [
      { id: 'weed_seed_0', label: '🌱 Seed Pack 0', yield: 10 },
      { id: 'weed_seed_3', label: '🌿 Seed Pack 3', yield: 50 },
      { id: 'weed_seed_6', label: '🌾 Seed Pack 6', yield: 150 },
      { id: 'weed_seed_9', label: '🍁 Seed Pack 9', yield: 250 },
      { id: 'weed_seed_11', label: '💎 Seed Pack 11', yield: 500 }
    ];

    const potOptions = [
      { id: 'weed_pot_0', label: '🪴 Cheap Pot', speed: 1 },
      { id: 'weed_pot_1', label: '🪴 Standard Pot', speed: 2 },
      { id: 'weed_pot_2', label: '🪴 Premium Pot', speed: 3 }
    ];

    const existing = await Plant.findOne({ userId, guildId });
    if (existing && !existing.harvested && !existing.dead) {
      return message.reply("🌿 You already have a plant growing. Use `!myplant` to manage it.");
    }

    const embed = new EmbedBuilder()
      .setTitle("🌱 Start Farming")
      .setDescription("Choose a seed and a pot to begin. If you have fertilizer or water, they’ll be auto-applied.")
      .setColor("#33aa55");

    const row1 = new ActionRowBuilder().addComponents(
      seedOptions.map(opt =>
        new ButtonBuilder()
          .setCustomId(`farm_seed_${opt.id}`)
          .setLabel(opt.label)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    const row2 = new ActionRowBuilder().addComponents(
      potOptions.map(opt =>
        new ButtonBuilder()
          .setCustomId(`farm_pot_${opt.id}`)
          .setLabel(opt.label)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row1, row2] });

    const selection = { seed: null, pot: null };
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async interaction => {

const selectedSeed = seedOptions.find(s => s.id === selection.seed);

const seedYield = selectedSeed?.yield || 3;

      if (interaction.user.id !== userId) return interaction.reply({ content: "Not your session.", ephemeral: true });

      if (interaction.customId.startsWith('farm_seed_')) {
        selection.seed = interaction.customId.replace('farm_seed_', '');
        await interaction.reply({ content: `🌱 Selected seed: **${selection.seed}**`, ephemeral: true });
      }

      if (interaction.customId.startsWith('farm_pot_')) {
        selection.pot = interaction.customId.replace('farm_pot_', '');
        await interaction.reply({ content: `🪴 Selected pot: **${selection.pot}**`, ephemeral: true });
      }

      if (selection.seed && selection.pot) {
        collector.stop();

        const potType = parseInt(selection.pot.replace('weed_pot_', ''), 10);
        const seedId = selection.seed;
        const inventory = await getInventory(userId, guildId);

        // 🎯 Auto-apply water
        const waterTypes = ['water_2', 'water_1', 'water_0'];
        let usedWater = null;
        for (const w of waterTypes) {
          if (inventory.has(w)) {
            await removeItem(userId, guildId, w, 1);
            usedWater = w;
            break;
          }
        }

        // 🎯 Auto-apply fertilizer
        const fertTypes = ['weed_fert_3', 'weed_fert_2', 'weed_fert_1', 'weed_fert_0'];
        let fertLevel = 0;
        for (let i = 0; i < fertTypes.length; i++) {
          const f = fertTypes[i];
          if (inventory.has(f)) {
            await removeItem(userId, guildId, f, 1);
            fertLevel = i;
            break;
          }
        }

await Plant.findOneAndUpdate(
  { userId, guildId },
  {
    userId,
    guildId,
    seedId,
    potType,
    yield: seedYield, // ✅ Save yield
    fertilizer: fertLevel,
    plantedAt: new Date(),
    lastWatered: new Date(),
    wateredAt: usedWater ? new Date() : null,
    harvested: false,
    dead: false,
    isDead: false
  },
  { upsert: true }
);


        const imageURL = `https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/farming/weed_r_p${potType}_0.png`;
        const embed = new EmbedBuilder()
          .setTitle("🌿 Your Plant Has Been Planted!")
          .setDescription(`**Seed:** ${seedId} | **Pot:** ${selection.pot}\n${usedWater ? `💧 Auto-watered with ${usedWater}` : '🚱 No water used'}\n${fertLevel > 0 ? `🌾 Fertilizer applied (Level ${fertLevel})` : 'No fertilizer applied'}`)
          .setImage(imageURL)
          .setColor("#66cc66")
          .setFooter({ text: "Use !myplant to check on its growth and water it." });

        await message.channel.send({ embeds: [embed] });
      }
    });
  }
});


client.commands.set('myplant', {
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const Plant = require('./models/PlantModel');
    const { addItem, getInventory, removeItem } = require('./economy/inventory');
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const Levels = require('./economy/xpRewards');
    const DealerProfile = require('./economy/dealerProfileModel');

    const seedOptions = [
      { id: 'weed_seed_0', yield: 10 },
      { id: 'weed_seed_3', yield: 50 },
      { id: 'weed_seed_6', yield: 150 },
      { id: 'weed_seed_9', yield: 250 },
      { id: 'weed_seed_11', yield: 500 }
    ];

    const plant = await Plant.findOne({ userId, guildId });
    if (!plant) return message.reply("🌱 You haven’t planted anything yet. Use !farm to begin.");

    const now = Date.now();
    const planted = new Date(plant.plantedAt).getTime();
    const watered = new Date(plant.lastWatered).getTime();
    const duration = 1000 * 60 * 10 / (1 + plant.potType + plant.fertilizer);
    const elapsed = now - planted;
    const stage = getStage(elapsed, duration);
    const rotTime = duration + 1000 * 60 * 10;

    if (!plant.dead && !plant.harvested && elapsed >= rotTime) {
      plant.dead = true;
      await plant.save();
    }

    const tooDry = now - watered > 1000 * 60 * 7;
    if (!plant.dead && !plant.harvested && tooDry) {
      plant.dead = true;
      await plant.save();
    }

    let status = '';
    if (plant.dead) status = '☠️ Dead plant (forgot to water or harvest)';
    else if (elapsed >= duration) status = '🌿 Ready to harvest';
    else status = '🌱 Growing';

    const waterStatus = watered ? `💧 Last watered: <t:${Math.floor(watered / 1000)}:R>` : '🚱 Never watered';
    const fertStatus = plant.fertilizer > 0 ? `🌾 Fertilizer Level: ${plant.fertilizer}` : '❌ No fertilizer';

    const imgURL = plant.dead
      ? `https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/farming/weed_r_p${plant.potType}_dead.png`
      : getPlantImage(plant.potType || 0, isNaN(stage) ? 0 : stage);

    const embed = new EmbedBuilder()
      .setTitle("🪴 Your Weed Plant")
      .setDescription(`**Status:** ${status}\n\n**Growth:**\n${getProgressBar(elapsed, duration)}\n\n${waterStatus}\n${fertStatus}`)
      .setThumbnail(message.author.displayAvatarURL())
      .setImage(imgURL)
      .setColor(plant.dead ? "#444444" : "#44dd88")
      .setFooter({ text: plant.harvested ? "✅ Already harvested" : "Water daily and check back!" });

    const components = [];
    const row = new ActionRowBuilder();

    if (!plant.dead && !plant.harvested) {
      row.addComponents(
        new ButtonBuilder().setCustomId('water_plant').setLabel('💧 Water').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('fertilize_plant').setLabel('🌾 Fertilize').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('harvest_plant').setLabel('🌿 Harvest').setStyle(ButtonStyle.Success).setDisabled(elapsed < duration)
      );
      components.push(row);
    } else if (plant.dead && !plant.harvested) {
      const deadRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('discard_plant').setLabel('🗑️ Discard').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('harvest_dead_plant').setLabel('🌿 Harvest (0)').setStyle(ButtonStyle.Secondary)
      );
      components.push(deadRow);
    }

    const sent = await message.channel.send({ embeds: [embed], components });

    const collector = sent.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async interaction => {
      if (interaction.user.id !== userId) return interaction.reply({ content: 'This isn’t your plant.', ephemeral: true });

      if (interaction.customId === 'discard_plant') {
        await Plant.deleteOne({ userId, guildId });
        return interaction.reply({ content: '🗑️ You discarded your dead plant. You may now `!farm` again.', ephemeral: true });
      }

      if (interaction.customId === 'harvest_dead_plant') {
        if (plant.harvested) return interaction.reply({ content: '❌ Already harvested.', ephemeral: true });
        await addItem(userId, guildId, 'weed', 0);
        plant.harvested = true;
        await plant.save();
        return interaction.reply({ content: `☠️ You harvested your dead plant. You got nothing, but it's cleared.`, ephemeral: true });
      }

      if (interaction.customId === 'water_plant') {
        plant.lastWatered = new Date();
        await plant.save();
        return interaction.reply({ content: '💧 You watered your plant.', ephemeral: true });
      }

      if (interaction.customId === 'fertilize_plant') {
        const inventory = await getInventory(userId, guildId);
        const fertLevels = ['weed_fert_3', 'weed_fert_2', 'weed_fert_1', 'weed_fert_0'];
        const bestFert = fertLevels.find(f => inventory[f] && inventory[f] > 0);
        if (!bestFert) return interaction.reply({ content: '❌ You don’t have any fertilizer.', ephemeral: true });

        const fertLevel = parseInt(bestFert.split('_').pop());
        plant.fertilizer = fertLevel;
        await plant.save();
        await removeItem(userId, guildId, bestFert, 1);
        return interaction.reply({ content: `🌾 You used **Fertilizer Level ${fertLevel}**. Growth will improve.`, ephemeral: true });
      }

if (interaction.customId === 'harvest_plant') {
  if (plant.harvested) return interaction.reply({ content: '❌ Already harvested.', ephemeral: true });

  console.log("🌿 HARVEST DEBUG - Plant Data:", {
    seedId: plant.seedId,
    potType: plant.potType,
    fertilizer: plant.fertilizer
  });

  const selectedSeed = seedOptions.find(s => s.id === plant.seedId);
  const baseYield = selectedSeed?.yield || 3;
  const potBonus = plant.potType || 0;
  const fertBonus = plant.fertilizer || 0;
  const yieldAmount = baseYield + potBonus * 2 + fertBonus * 2;

  console.log(`🌿 HARVEST DEBUG - Found seed yield: ${baseYield}`);
  console.log(`🌿 HARVEST DEBUG - Calculated yieldAmount: ${yieldAmount}`);

  // Add to inventory
const inv = profile.inventory instanceof Map
  ? Object.fromEntries(profile.inventory)
  : { ...profile.inventory };

inv['weed'] = (inv['weed'] || 0) + yieldAmount;
profile.inventory = inv;
profile.markModified('inventory');
profile.stashUsed += yieldAmount;
profile.markModified('stashUsed');
await profile.save();

  console.log("🌿 HARVEST DEBUG - Called addItem");

  // Add to stashUsed
  const profile = await DealerProfile.findOne({ userId, guildId });
  if (profile) {
    profile.stashUsed += yieldAmount;
    profile.markModified('stashUsed');
    await profile.save();
    console.log("🌿 HARVEST DEBUG - Updated stashUsed in DealerProfile");
  } else {
    console.log("🌿 HARVEST DEBUG - DealerProfile not found for user");
  }

  plant.harvested = true;
  await plant.save();
  console.log("🌿 HARVEST DEBUG - Marked plant as harvested and saved");

  await Levels.appendXp(userId, guildId, yieldAmount * 10);
  console.log(`🌿 HARVEST DEBUG - Added XP: ${yieldAmount * 10}`);

  return interaction.reply({ content: `🌿 You harvested **${yieldAmount}x weed**. Added to your stash.`, ephemeral: true });
}

    });
  }
});


client.commands.set('fashion', fashion);

client.commands.set('wardrobe', wardrobe);

client.commands.set('fashionboard', fashionboard);

client.commands.set('gangs', gangViewer);

// ✅ Vouch Command
client.commands.set('vouch', {
  async execute(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply("You need to tag someone to vouch.");

    try {
      npcNames.forEach(npc => adjustMood(target.id, npc, 2));
      message.channel.send(`🗣️ ${message.author.username} vouched for ${target.username}. NPC trust rising.`);
    } catch (err) {
      console.error("❌ VOUCH ERROR:", err);
      return message.reply("Something went wrong while adjusting NPC moods.");
    }
  }
});

// ✅ Trash Command
client.commands.set('trash', {
  async execute(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply("You need to tag someone to talk trash about.");

    try {
      npcNames.forEach(npc => adjustMood(target.id, npc, -2));
      message.channel.send(`🗑️ ${message.author.username} talked trash about ${target.username}. NPCs watching...`);
    } catch (err) {
      console.error("❌ TRASH ERROR:", err);
      return message.reply("Something went wrong while adjusting NPC moods.");
    }
  }
});

client.commands.set('grantbank', require('./commands/grantbank'));
client.commands.set('deposit', require('./commands/deposit'));
client.commands.set('withdraw', require('./commands/withdraw'));
client.on('messageCreate', require('./events/crystalAI').execute);
client.on('messageCreate', crystalAI.execute);
client.commands.set('play', require('./commands/play.js'));
client.commands.set('crystal', crystalAI);

// ✅ Automatically trigger mule if player is overstocked
async function maybeSpawnMule(client, userId, guildId, channel) {
  const DealerProfile = require('./economy/dealerProfileModel');
  const { trySpawnMule } = require('./events/npc/npcMules');

  const profile = await DealerProfile.findOne({ userId, guildId });
  if (!profile || !profile.inventory) {
    console.log(`[MULE FIX] No dealer profile or inventory for user ${userId}`);
    return;
  }

  const inventory = profile.inventory instanceof Map
    ? Object.fromEntries(profile.inventory)
    : profile.inventory;

  const stashCount = Object.values(inventory).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
  console.log(`[MULE FIX] Detected stashCount=${stashCount} for user ${userId}`);

  // Now trigger spawn using actual inventory
  trySpawnMule(userId, guildId, inventory, channel);
}

console.log("adjustMood:", typeof adjustMood);

try {
  sendWinDrama(client, winner.userId, pool.pool);
} catch (err) {
  console.warn('Drama send failed:', err.message);
}

setInterval(() => {
  scanAllSnipers(client);
}, 144000 * 60 * 5); // Every 5 minutes

setInterval(() => {
  const now = Date.now();
  for (const [id, end] of hideoutMap.entries()) {
    if (end <= now) hideoutMap.delete(id);
  }
}, 60 * 1000);

setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of heatMap) {
    if (now - data.lastActivity >= 10 * 60 * 1000) { // 10 minutes of no activity
      data.heat = Math.max(0, data.heat - 10);
      heatMap.set(userId, data);
    }
  }
}, 5 * 60 * 1000); // Check every 5 mins

setInterval(() => {
  rotateShop();
}, 20 * 60 * 1000); // Rotate every 20 minutes



app.use('/stripe/webhook', stripeWebhook);
app.use('/paypal/webhook', paypalWebhook);
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Keep-alive server running'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('🛑 UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err);
});
