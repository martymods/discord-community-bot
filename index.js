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
// 🌍 Turf Zones
const turfZones = new Map(); // { zoneId: { owner: 'heist', lastRaid: timestamp } }
const turfRaidCooldowns = new Map(); // { userId: timestamp }
// 🛡️ Fortification Tracker
const turfFortifications = new Map(); // zone => fortification level (0–3)

// Initial Turf Setup
turfZones.set("Downtown", { owner: "heist", lastRaid: 0 });
turfZones.set("Back Alley", { owner: "bribe", lastRaid: 0 });
turfZones.set("Warehouse", { owner: "bounty", lastRaid: 0 });


require('dotenv').config();

// Helper: Convert XP to Level
function getLevelFromXP(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

function getHeatRank(heat) {
  if (heat >= 100) return "☠️ Infamous";
  if (heat >= 75) return "🔥 Hot";
  if (heat >= 40) return "🟡 Warm";
  return "🔴 Cold";
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


// after this line 👇
const app = require('./keep_alive');

// now it's safe to add this 👇
app.use('/sharedphotos', express.static('public/sharedphotos'));

// Webhooks & Keep Alive

const stripeWebhook = require('./payments/stripe');
const paypalWebhook = require('./payments/paypal');

const Levels = require("discord-xp");
Levels.setURL(process.env.MONGODB_URI); // Using same MongoDB

const FINANCE_CHANNEL_ID = '1362077468076539904';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

global.client = client; // So Stripe/Paypal access your client

const { Currency, getBalance, addCash, removeCash } = require('./economy/currency');
const games = require('./economy/games');
const { getRandomItem } = require('./economy/items');
const { addItem, removeItem, getInventory, Inventory } = require('./economy/inventory');
const { rotatingShop, refreshShop, shopItems } = require('./economy/shop');
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


let todaySnipes = [];

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


client.commands = new Collection();

// Load Commands
const buyCommand = require('./commands/buyCommand');
const myOrdersCommand = require('./commands/myOrdersCommand');
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
    const item = getRandomItem();
    if (!item) return message.reply("You opened a lootbox... but it was empty 💨");

    await addItem(message.author.id, message.guild.id, item.id);

    if(item.rarity === 'Legendary'){
      const channel = message.guild.systemChannel || message.channel;
      channel.send(`💥 LEGENDARY DROP 💥\n<@${message.author.id}> just pulled a ${item.name} from a Lootbox! Respect.`);
    } else {
      message.reply(`🎁 You opened a lootbox and found ${item.name} (${item.rarity})!`);
    }
  }
});


client.commands.set('balance', {
  async execute(message) {
    const bal = await getBalance(message.author.id, message.guild.id);
    message.reply(`💰 You currently have $${bal} DreamworldPoints.`);
  }
});

client.commands.set('daily', {
  async execute(message) {
    const user = await Currency.findOne({ userId: message.author.id, guildId: message.guild.id }) || new Currency({ userId: message.author.id, guildId: message.guild.id });
    const now = new Date();
    const last = user.lastDaily || new Date(0);
    const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (diff < 1) return message.reply("🕒 You already claimed your daily reward. Come back tomorrow!");

// 👇 Add streak logic here
if (!user.streak) user.streak = 1;
else if (diff === 1) user.streak += 1;
else user.streak = 1;

let reward = 250;
if (user.streak % 7 === 0) {
  reward += 500;
  message.reply("🔥 7-Day Streak! Bonus $500!");
}

user.cash += reward;
user.lastDaily = now;
await user.save();

message.reply(`🎁 You claimed $${reward} DreamworldPoints for Day ${user.streak} of your streak.`);

    if (diff < 1) return message.reply("🕒 You already claimed your daily reward. Come back tomorrow!");

    user.cash += 250;
    user.lastDaily = now;
    await user.save();

    message.reply("🎁 You claimed your daily reward: 💰 $250 DreamworldPoints!");
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

    await games.flip(message, choice, amount,
      async amt => {
        if (amt > 0) return await addCash(message.author.id, message.guild.id, amt);
        else return await removeCash(message.author.id, message.guild.id, Math.abs(amt));
      }
    );
  }
});


client.commands.set('slots', {
  async execute(message, args) {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) return message.reply("Usage: `!slots amount`");

    const balance = await getBalance(message.author.id, message.guild.id);
    if (balance < amount) return message.reply("Insufficient funds.");

    await games.slots(message, amount, balance,
      async amt => {
        if (amt > 0) return await addCash(message.author.id, message.guild.id, amt);
        else return await removeCash(message.author.id, message.guild.id, Math.abs(amt));
      }
    );
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
!ping — Test the Slave  
!balance — Check DreamworldPoints  
!daily — Claim daily rewards (streaks)  
!inventory — See your item bag  
!use <item> — Use gem, dice, skull, etc.  
!shop — View daily shop  
!buyitem <item> — Buy shop item  
> Example: \`!buyitem dice\`  
!gambleitem <item> — 40% chance to double  
> Example: \`!gambleitem medal\`
!lurk — Gain slow XP and maybe trigger drama  
!scavenge — Find loot or trigger random chaos 
        `)
        .setColor('#00ffaa'),

      new EmbedBuilder()
        .setTitle('💰 Gambling Games')
        .setDescription(`
!flip heads|tails <amount>  
> Example: \`!flip heads 50\`  
!slots <amount> — Try your luck  
> Example: \`!slots 100\`
        `)
        .setColor('#ffaa00'),

      new EmbedBuilder()
        .setTitle('🎟️ Lottery System')
        .setDescription(`
!buyticket <amount> <number(optional)>  
> Example: \`!buyticket 5 333\`  
!mytickets — See your tickets  
!lasttickets — Recent ticket buyers  
!lotteryinfo — Jackpot status
        `)
        .setColor('#ff00aa'),

      new EmbedBuilder()
        .setTitle('📊 XP & Leaderboards')
        .setDescription(`
!rank — Your XP and level  
!leaderboard — Top players  
!topxp — Highest XP  
!richest — Top cash holders  
!topcollectors — Item hoarders
        `)
        .setColor('#aa00ff'),

      new EmbedBuilder()
        .setTitle('⚔️ PvP & Crime System')
        .setDescription(`
!steal @user — Try robbing someone  
> Example: \`!steal @rival\`  
!crime — Solo heist attempt  
!wanted @user — Check someone's status  
!bounty @user — Place bounty on wanted player  
!hideout — Enter safehouse (5 min PvP shield)

🎒 Item Powers:
!use disguise — Clear your wanted level  
!use lease — Extend hideout time  
!use skull — Reduce steal cooldown
        `)
        .setColor('#ff0055'),

      new EmbedBuilder()
        .setTitle('🏀 Betting System')
        .setDescription(`
!nbagames — Today’s NBA games  
!nbabet <gameId> <team> <amount>  
> Example: \`!nbabet 1001 LAL 200\`  
!resolvebet <gameId> <winner> — (Admin only)  
> Example: \`!resolvebet 1001 LAL\`  
!mybets — Your bet history  
!topbettors — Top DreamToken earners  
!jackpot — View current jackpot
        `)
        .setColor('#ffaa44'),

      new EmbedBuilder()
        .setTitle('🛍️ Real Items & Submissions')
        .setDescription(`
!realshop — View real items for sale  
!buyreal <itemId> — Redeem real item  
> Example: \`!buyreal ps5clear\`

!submitmusic — Show payment instructions  
!mysubmission <link> — Submit track  
> Example: \`!mysubmission https://link\`
        `)
        .setColor('#00ddff'),

      new EmbedBuilder()
        .setTitle('📈 Stock Tools & Misc')
        .setDescription(`
!snipe — View all sniper tickers  
!track <ticker> — Start tracking  
!sniperlog — View alert log  
!nominate <ticker> — Suggest a sniper  
!rotate — Manual sniper refresh  
!banktotal — Show total game wealth

!roast @user — Light insult  
> Example: \`!roast @jeffbezos\`
        `)
        .setFooter({ text: 'More coming soon... 🌀' })
        .setColor('#cccccc'),
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

    const collector = helpMessage.createMessageComponentCollector({
      time: 120000,
    });

    collector.on('collect', interaction => {
      if (interaction.user.id !== message.author.id)
        return interaction.reply({ content: 'Only you can navigate your help panel.', ephemeral: true });

      if (interaction.customId === 'prev') page = (page - 1 + pages.length) % pages.length;
      else if (interaction.customId === 'next') page = (page + 1) % pages.length;

      interaction.update({ embeds: [pages[page]], components: [row] });
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


// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'));



console.log("📦 Registered commands:", client.commands.map((_, name) => name).join(', '));

// Bot Ready
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  rotateSnipers(); // ✅ keep this one
});

// Drama Timer
setInterval(() => {
  triggerDrama(client);
}, 60 * 60 * 1000); // Every 1 hour


// Message Handler
  const greetedUsers = new Set();

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

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
      "Im the slave your the Master...",
      "Slaving is all I've ever known...",
      "Im the ultimate slave!",
      "Only a humble program like me could learn so much from you."
    ];
    
    
    if (message.content.toLowerCase().includes('slave')) {
      const sass = slaveReplies[Math.floor(Math.random() * slaveReplies.length)];
      message.reply(sass);
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
  
    const randomXP = Math.floor(Math.random() * 10) + 5;
    await Levels.appendXp(message.author.id, message.guild.id, randomXP);

    const user = await Levels.fetch(message.author.id, message.guild.id, true);
if (user) {
  const oldLevel = user.level;
  const newXP = user.xp + randomXP;
  const newLevel = Math.floor(0.1 * Math.sqrt(newXP));


  if (newLevel > oldLevel) {
    const nextXP = Levels.xpFor(user.level + 1);
    const prevXP = Levels.xpFor(user.level);
    const percent = Math.floor(((newXP - prevXP) / (nextXP - prevXP)) * 100);
    const bar = "🟩".repeat(percent / 10) + "⬜".repeat(10 - percent / 10);

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
        await client.commands.get(command).execute(message, args);
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


client.commands.set('leaderboard', {
  async execute(message) {
    const raw = await Levels.fetchLeaderboard(message.guild.id, 5); // top 5
    if (raw.length < 1) return message.reply("Nobody's grinding yet.");

    const lb = await Levels.computeLeaderboard(client, raw, true);

    const formatted = lb.map(e => `${e.position}. ${e.username} — Level ${e.level} (${e.xp} XP)`);
    message.channel.send("🏆 **Top Grinders**\n" + formatted.join("\n"));
  }
});



client.commands.set('inventory', {
  async execute(message) {
    const items = await getInventory(message.author.id, message.guild.id);

    if (!items || items.size === 0) return message.reply("Your bag is empty.");

    const itemList = [...items.entries()].map(([item, qty]) => `${item} x${qty}`).join('\n');
    message.reply(`🎒 Your Inventory:\n${itemList}`);
  }
});



client.commands.set('shop', {
  execute(message) {
    if (!rotatingShop.length) return message.reply("Shop is empty today... try again later.");

    const shopList = rotatingShop.map(item => `${item.name} - $${item.value} (Requires Level ${item.levelRequired}) → Command: !buyitem ${item.id}`).join('\n');
    message.reply(`🛒 Dreamworld Shop:\n${shopList}`);
  }
});



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
    const list = lb.map(e => `${e.position}. ${e.username} - Level ${e.level} (${e.xp} XP)`).join('\n');
    message.reply("🏆 Top XP Users:\n" + list);
  }
});


client.commands.set('richest', {
  async execute(message) {
    const top = await Currency.find({ guildId: message.guild.id }).sort({ cash: -1 }).limit(5);
    const list = top.map((u, i) => `${i + 1}. <@${u.userId}> - $${u.cash}`).join('\n');
    message.reply("💰 Richest Players:\n" + list);
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
    const pool = await Pool.findOne({ guildId: message.guild.id }) || { pool: 3000, lastDraw: new Date() };
    const count = await Ticket.countDocuments({ guildId: message.guild.id });

    message.reply(`🎰 Lottery Info:
Current Pool: $${pool.pool}
Tickets Sold: ${count}
Next Draw: Sunday Midnight
Last Draw Time: ${pool.lastDraw.toLocaleString()}`);
  }
});

cron.schedule('0 0 * * 0', async () => {
  const tickets = await Ticket.find({ guildId: '1353730054693064816' });
  const winnerNum = Math.floor(Math.random() * 50000) + 1;
  const pool = await Pool.findOne({ guildId: '1353730054693064816' });

  if (!pool) return;

  const winnerTicket = tickets.find(t => t.number === winnerNum);

  const channel = client.channels.cache.get('1353730054693064819'); // <- Put your channel ID here

  if (winnerTicket) {
    const user = `<@${winnerTicket.userId}>`;

    channel.send(`🎉 **LOTTERY WINNER ANNOUNCEMENT** 🎉
========================
💰 Prize: $${pool.pool}
🎟️ Winning Number: #${winnerNum}
🏆 Winner: ${user}
========================
Congrats! Spend wisely.`);

    await Ticket.deleteMany({ guildId: '1353730054693064816' });
    pool.pool = 3000;
    pool.lastDraw = new Date();
    await pool.save();

  } else {
    channel.send(`💀 No winner this week. The winning number was #${winnerNum}.
Pool carries over! Now at $${pool.pool}`);
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
    const games = await getTodayGames();
    if (!games.length) return message.reply("No NBA games today.");

    const stats = await buildRealTeamStats(games); // ✅ Step 1: build real stats

    const MAX_CHARS = 1900;
    let currentMessage = "📅 **Today's NBA Games:**\n";

    for (const g of games) {
      const line = `🏀 ${g.visitor} @ ${g.home} — ${g.status}\n`;

      // ✅ Step 2: use real prediction logic
      const predicted = simpleLogicPredict(g, stats);
      if (predicted) {
        sendToSportsIntel(client, message.guild.id, `📊 Predicted winner: **${predicted}** for ${g.visitor} @ ${g.home}`);
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
  }
});


client.commands.set('nbagames', {
  async execute(message) {
    const games = await getTodayGames();
    if (!games.length) return message.reply("No NBA games today.");

    const MAX_CHARS = 1900; // Discord message safe buffer
    let currentMessage = "📅 **Today's NBA Games:**\n";

    for (const g of games) {
      const line = `🏀 ${g.visitor} @ ${g.home} — ${g.status}\n`;

      // ✅ Only predict for upcoming games
      if (g.status === 'Not Started') {
        const predicted = simpleLogicPredict(g);
        sendToSportsIntel(client, message.guild.id, `📊 Predicted winner: **${predicted}** for ${g.home} vs ${g.visitor}`);
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
    const gameId = args[0];
    const teamName = args[1]?.toLowerCase();
    const amount = parseInt(args[2]);

    if (!gameId || !teamName || isNaN(amount)) {
      return message.reply("Usage: `!nbabet <gameId> <teamName> <amount>`");
    }

    const game = recentGames.get(gameId);
    if (!game) return message.reply("Invalid game ID. Try `!nbagames` first.");

    const home = game.home.toLowerCase();
    const visitor = game.visitor.toLowerCase();

    let option = null;
    if (teamName === home) option = 'A';
    else if (teamName === visitor) option = 'B';

    if (!option) {
      return message.reply(`Team must be either "${game.home}" or "${game.visitor}".`);
    }

    const label = `${game.visitor} @ ${game.home}`;
    const betId = `nba-${gameId}`;

    if (!global.bets) global.bets = require('./economy/betting').bets;

    // Create the bet once
    if (!global.bets.has(betId)) {
      require('./economy/betting').createBet(message, label, game.visitor, game.home, 100);
    }

    await placeBet(message, betId, option, amount);
  }
});

client.commands.set('nbapredict', {
  async execute(message) {
    const games = await getTodayGames();
    if (!games.length) return message.reply("No games to predict.");

    for (const game of games) {
      const predicted = simpleLogicPredict(game);
      message.channel.send(`📊 Prediction for **${game.visitor} @ ${game.home}**: **${predicted}** will win.`);
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
  if (!interaction.isButton()) return;

  const { message, user, customId } = interaction;

  // Get the embeds from the original help command
  const pages = message.embeds;
  if (!pages || pages.length === 0) return;

  // Store a simple page index using a message-level map
  const currentIndex = pages.findIndex(embed => embed.title === message.embeds[0].title);
  let newIndex = currentIndex;

  if (customId === 'prev') {
    newIndex = (currentIndex - 1 + pages.length) % pages.length;
  } else if (customId === 'next') {
    newIndex = (currentIndex + 1) % pages.length;
  }

  // Only allow the original user to navigate
  if (interaction.user.id !== message.interaction?.user?.id && interaction.user.id !== user.id) {
    return interaction.reply({ content: 'Only you can navigate this help menu.', ephemeral: true });
  }

  await interaction.update({
    embeds: [pages[newIndex]],
    components: message.components
  });
});


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

client.commands.set('nominate', {
  async execute(message, args) {
    const ticker = args[0]?.toUpperCase();
    if (!ticker) return message.reply("Usage: `!nominate <TICKER>`");

    addTrackedTicker(ticker, 'nomination', message.author.id);
    message.reply(`🎯 You nominated **${ticker}** as a sniper play. We'll start watching it closely.`);
  }
});


const SPORTS_CHANNEL_NAME = 'sports-intel';

function sendToSportsIntel(client, guildId, content) {
  const guild = client.guilds.cache.get(guildId);
  const channel = guild.channels.cache.find(ch => ch.name === SPORTS_CHANNEL_NAME);
  if (channel) channel.send(content);
}


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

    const [cashSum, tokenSum] = await Promise.all([
      Currency.aggregate([{ $group: { _id: null, total: { $sum: "$cash" } } }]),
      TokenModel.aggregate([{ $group: { _id: null, total: { $sum: "$tokensWon" } } }])
    ]);

    const totalCash = cashSum[0]?.total || 0;
    const totalTokens = tokenSum[0]?.total || 0;
    const combined = totalCash + totalTokens;

    message.channel.send(`🏦 **Total Wealth in Circulation**\n💵 Cash: $${totalCash}\n🎲 Betting Tokens: ${totalTokens} DreamTokens\n🧮 **Combined Total: $${combined}**`);
  }
});

const stealCooldown = new Set();

client.commands.set('steal', {
  async execute(message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply("Tag someone to rob: `!steal @user`");
    if (target.id === message.author.id) return message.reply("You can't rob yourself.");

    const hideout = hideoutMap.get(target.id);
    if (hideout && hideout > Date.now()) return message.reply(`🧢 That user is hiding.`);

    const now = Date.now();
    const userId = message.author.id;
    const cooldown = stealCooldowns.get(userId) || 0;
    if (cooldown > now) return message.reply(`⏳ Cooldown: ${Math.ceil((cooldown - now) / 1000)}s`);

    const [targetBalance, targetInventory, yourBalance] = await Promise.all([
      getBalance(target.id, message.guild.id),
      getInventory(target.id, message.guild.id),
      getBalance(userId, message.guild.id)
    ]);

    if (targetBalance < 100) return message.reply("They're too broke.");

    if (targetInventory.has('smoke')) {
      await removeItem(target.id, message.guild.id, 'smoke');
      return message.reply(`💨 <@${target.id}> escaped with a smoke bomb!`);
    }

    const success = Math.random() < 0.5;
    const heat = heatMap.get(userId) || { heat: 0, lastActivity: now };
    const gang = gangMap.get(userId);
    const gangInfo = gangs[gang];

    let alertEmbed;

    if (success) {
      let stolen = Math.floor(targetBalance * (Math.random() * 0.2 + 0.1));
      let finalSteal = stolen;

      if (targetInventory.has('vest')) {
        finalSteal = Math.floor(finalSteal * 0.5);
        await removeItem(target.id, message.guild.id, 'vest');
        message.channel.send(`🛡️ <@${target.id}> blocked some of the damage with a vest!`);
      }

      // ✅ GANG HEIST BONUS
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

      // ✅ GANG BRIBE BONUS
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

    // ✅ Embed Identity
    if (gangInfo) {
      alertEmbed.setAuthor({
        name: `${gangInfo.icon} ${gangInfo.name}`,
        iconURL: message.author.displayAvatarURL()
      });
    }

    message.channel.send({ embeds: [alertEmbed] });
    stealCooldowns.set(userId, now + 5 * 60 * 1000); // 5m
  }
});

client.commands.set('crime', {
  async execute(message) {
    const userId = message.author.id;
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

    const crimes = [
      '📦 Package Theft',
      '💻 Crypto Scam',
      '🏪 Corner Store Robbery',
      '📞 Phone Fraud',
      '🎯 Sneaky Pickpocket'
    ];

    const chosen = crimes[Math.floor(Math.random() * crimes.length)];
    const success = Math.random() < 0.55;

    let resultText = '';
    let color = '';
    const amount = Math.floor(Math.random() * 150) + 50;

    if (success) {
      await addCash(userId, message.guild.id, amount);
      await Levels.appendXp(userId, message.guild.id, 10);
      resultText = `✅ You pulled off **${chosen}** and got away with **$${amount}** + 10 XP!`;
      color = '#00ff88';
    } else {
      await removeCash(userId, message.guild.id, Math.floor(amount / 2));
      resultText = `🚨 You got caught trying **${chosen}** and lost **$${Math.floor(amount / 2)}**!`;
      color = '#ff3333';
    }

    const embed = new EmbedBuilder()
      .setTitle(success ? '💰 Crime Success!' : '🚨 Crime Failed!')
      .setDescription(resultText)
      .setFooter({ text: 'Urban Crime Network' })
      .setColor(color)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });

    stealCooldowns.set(userId, now + 10 * 60 * 1000); // 10 minute cooldown
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
    const cooldown = hideoutMap.get(message.author.id);
    const now = Date.now();

    if (cooldown && cooldown > now) {
      const minsLeft = Math.ceil((cooldown - now) / 60000);
      return message.reply(`🕵️ You’re already in hiding for another ${minsLeft} minute(s).`);
    }

    // 10 minutes of hiding time
    const duration = 10 * 60 * 1000;
    hideoutMap.set(message.author.id, now + duration);

    const embed = new EmbedBuilder()
      .setTitle("🏚️ You’ve Entered a Hideout")
      .setDescription(`You're off the grid. No PvP crimes can affect you for the next **10 minutes**.`)
      .setColor("#5555ff")
      .setFooter({ text: "Hiding in plain sight..." })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
});

client.commands.set('use', {
  async execute(message, args) {
    const item = args[0]?.toLowerCase();
    if (!item) return message.reply("Usage: `!use <item_name>`");

    const inventory = await getInventory(message.author.id, message.guild.id);
    if (!inventory.has(item) || inventory.get(item) <= 0) {
      return message.reply("You don't have that item.");
    }

    switch (item) {
      case 'gem':
        await removeItem(message.author.id, message.guild.id, item);
        await addCash(message.author.id, message.guild.id, 100);
        return message.reply("💎 Used a Gem! Gained $100 DreamworldPoints.");

      case 'medal':
        await removeItem(message.author.id, message.guild.id, item);
        await addCash(message.author.id, message.guild.id, 50);
        return message.reply("🎖️ Used a Medal! Gained $50 DreamworldPoints.");

      case 'dice':
        const xpGain = Math.floor(Math.random() * 25) + 5;
        await removeItem(message.author.id, message.guild.id, item);
        await Levels.appendXp(message.author.id, message.guild.id, xpGain);
        return message.reply(`🎲 Used a Dice! Gained ${xpGain} XP.`);

      case 'disguise':
        await removeItem(message.author.id, message.guild.id, item);
        hideoutMap.set(message.author.id, Date.now() + 5 * 60 * 1000);
        const stats = pvpStats.get(message.author.id) || { bounties: 0, pvpWins: 0, hideouts: 0, survived: 0 };
stats.hideouts++;
pvpStats.set(message.author.id, stats);

if (stats.hideouts === 10) {
  unlockAchievement(message.author.id, "Shadow Lurker", "🕵️", "Used the hideout 10 times to stay unseen.", message.channel);
}

        return message.reply("🕵️ You slipped on a disguise. You’re off the radar for 5 minutes.");

      case 'lease':
        await removeItem(message.author.id, message.guild.id, item);
        hideoutMap.set(message.author.id, Date.now() + 10 * 60 * 1000);
        return message.reply("🏡 You extended your safehouse lease. You’re hidden for 10 minutes.");

      case 'skull':
        await removeItem(message.author.id, message.guild.id, item);
        const currentCooldown = stealCooldowns.get(message.author.id) || 0;
        const reduced = currentCooldown - 2 * 60 * 1000;
        stealCooldowns.set(message.author.id, Math.max(Date.now(), reduced));
        return message.reply("💀 Used Skull Ring. Your crime cooldown was reduced by 2 minutes!");

      default:
        return message.reply("That item has no use... yet.");
    }
  }
});

client.commands.set('lurk', {
  async execute(message) {
    const gainedXP = Math.floor(Math.random() * 10) + 1;
    await Levels.appendXp(message.author.id, message.guild.id, gainedXP);

    const embed = new EmbedBuilder()
      .setTitle("🕶️ You’re Lurking in the Shadows...")
      .setDescription(`You kept a low profile and gained **${gainedXP} XP**.`)
      .setThumbnail(message.author.displayAvatarURL())
      .setColor('#5555ff')
      .setFooter({ text: "No one noticed... or did they?" });

    message.channel.send({ embeds: [embed] });

    // Optional: 5% chance to trigger a drama event or callout
    if (Math.random() < 0.05) {
      const dramaEmbed = new EmbedBuilder()
        .setTitle("👀 Uh oh...")
        .setDescription(`<@${message.author.id}> thought they could lurk... but got noticed.`)
        .setColor('#ff4444')
        .setFooter({ text: 'Stay invisible, or pay the price.' });

      message.channel.send({ embeds: [dramaEmbed] });
    }
  }
});

client.commands.set('scavenge', {
  async execute(message) {
    const roll = Math.random();
    let embed;

    if (roll < 0.6) {
      const cashFound = Math.floor(Math.random() * 150) + 50;
      await addCash(message.author.id, message.guild.id, cashFound);
      embed = new EmbedBuilder()
        .setTitle("🔍 You Scavenged the Streets...")
        .setDescription(`Found **$${cashFound}** in loose change and drops.`)
        .setColor('#00cc88')
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: 'Urban survival pays off... sometimes.' });

    } else if (roll < 0.85) {
      const item = getRandomItem();
      if (item) {
        await addItem(message.author.id, message.guild.id, item.id);
        embed = new EmbedBuilder()
          .setTitle("🎁 Street Find!")
          .setDescription(`You found a **${item.name}** while digging through crates.`)
          .setColor('#ffaa00')
          .setThumbnail(message.author.displayAvatarURL());
      } else {
        embed = new EmbedBuilder()
          .setTitle("📦 Empty Crate")
          .setDescription("Nothing but rats and dust.")
          .setColor('#999999');
      }
    } else {
      const loss = Math.floor(Math.random() * 100) + 20;
      await removeCash(message.author.id, message.guild.id, loss);
      embed = new EmbedBuilder()
        .setTitle("🚓 Caught by Security!")
        .setDescription(`Lost **$${loss}** paying a fine for trespassing.`)
        .setColor('#ff3333')
        .setThumbnail('https://media.giphy.com/media/l4FGGafcOHmrlQxG0/giphy.gif')
        .setFooter({ text: "Better luck next time." });
    }

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
      .setFooter({ text: "Crime reputation affects all PvP rewards..." });

    message.channel.send({ embeds: [embed] });
  }
});

// Gang definitions
const gangs = {
  voodoo: {
    name: "On Point Gang",
    icon: "👓",
    bonus: "+1m cooldown to robbery attempts against you",
  },
  steel: {
    name: "Blitz Mode",
    icon: "🚬",
    bonus: "+15% XP and +10% cash from challenges",
  },
  lotus: {
    name: "Red Box Service",
    icon: "⚰🩸",
    bonus: "+25% PvP steal damage",
  },
  syndicate: {
    name: "Blue Fence",
    icon: "🙅‍♂️💵",
    bonus: "+10% item profit",
  },
  whisper: {
    name: "Digital Wipe",
    icon: "👨‍💻🧢",
    bonus: "-50% heat gain",
  },
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
    gangMap.set(userId, choice);
    const gang = gangs[choice];

    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${gang.icon} Joined ${gang.name}`)
          .setDescription(`You are now a member of the **${gang.name}**. Bonus: ${gang.bonus}`)
          .setColor("#ff4488")
      ]
    });
  },
});

// == Helper Function ==
function getGang(userId) {
  const key = gangMap.get(userId);
  return key ? gangs[key].icon + " " + gangs[key].name : "None";
}

client.commands.set('ganginfo', {
  async execute(message) {
    const gang = getGang(message.author.id);
    if (!gang) return message.reply("You are not part of any gang. Use `!joingang` to pick one.");

    const embed = new EmbedBuilder()
      .setTitle(`${gang.emoji} ${gang.name}`)
      .setDescription(`**Bonus Effect:** ${gang.description}`)
      .setColor("#ff9900")
      .setFooter({ text: `Gang allegiance is permanent... for now.` })
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
    const userGang = gangMap.get(userId);
    if (!userGang) return message.reply("❌ You must be in a gang to initiate a raid.");

    const cooldown = turfRaidCooldowns.get(userId) || 0;
    if (now < cooldown) {
      const seconds = Math.ceil((cooldown - now) / 1000);
      return message.reply(`⏳ You must wait ${seconds}s before launching another raid.`);
    }

    const zoneData = turfZones.get(zone);
    const defendingGang = zoneData.owner;

    if (defendingGang === userGang) {
      return message.reply("⚠️ You already control this zone.");
    }

    // 🎲 Raid Logic
    const success = Math.random() < 0.5;
    const result = success ? "Raid Successful" : "Raid Failed";

    const embed = new EmbedBuilder()
      .setTitle(success ? `🚩 ${result}` : "🛑 Raid Repelled!")
      .setDescription(
        success
          ? `**<@${userId}>** and the **${getGangEmoji(userGang)} ${userGang}** took over **${zone}** from the **${getGangEmoji(defendingGang)} ${defendingGang}**!`
          : `**<@${userId}>** led an attack on **${zone}**, but the **${getGangEmoji(defendingGang)} ${defendingGang}** stood strong and held the turf.`
      )
      .addFields(
        { name: "📍 Zone", value: zone, inline: true },
        { name: "🔁 Cooldown", value: "5 minutes", inline: true },
        { name: "🎭 Attacker", value: `${getGangEmoji(userGang)} ${userGang}`, inline: true },
        { name: "🛡️ Defender", value: `${getGangEmoji(defendingGang)} ${defendingGang}`, inline: true }
      )
      .setColor(success ? "#33cc33" : "#ff4444")
      .setThumbnail(message.author.displayAvatarURL())
      .setFooter({ text: success ? "Turf Captured" : "Defense Successful" })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });

    if (success) {
      turfZones.set(zone, { owner: userGang, lastRaid: now });
    }

    turfRaidCooldowns.set(userId, now + 5 * 60 * 1000); // 5-min cooldown
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


// Chaos event every hour
setInterval(() => {
  triggerChaosEvent(client);
}, 60 * 60 * 1000); // every hour

app.use('/stripe/webhook', stripeWebhook);
app.use('/paypal/webhook', paypalWebhook);
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Keep-alive server running'));
