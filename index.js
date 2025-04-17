const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express'); // ✅ <-- ADD THIS LINE
const stealCooldowns = new Map(); // userId → timestamp
const wantedMap = new Map(); // userId -> { fails: Number, watched: Boolean }
const hideoutMap = new Map(); // userId → timestamp when hideout expires
require('dotenv').config();


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
!use <item> — Use item like gem/dice  
!shop — View daily shop  
!buyitem <item> — Buy shop item  
> Example: \`!buyitem dice\`  
!gambleitem <item> — 40% chance to double  
> Example: \`!gambleitem medal\`
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
        .setTitle('🏀 Betting & PvP')
        .setDescription(`
!nbagames — Today's NBA games  
!nbabet <gameId> <team> <amount>  
> Example: \`!nbabet 1001 LAL 200\`  
!resolvebet <gameId> <winner> — Manual resolve  
!mybets — Your bet history  
!topbettors — Top DreamToken earners  
!jackpot — View current pot

!steal @user — Try robbing someone  
!challenge @user <amount>  
!accept <userId> — Accept a duel
        `)
        .setColor('#ff5555'),

      new EmbedBuilder()
        .setTitle('🛍️ Real Items & Submissions')
        .setDescription(`
!realshop — View real items  
!buyreal <itemId>  
> Example: \`!buyreal ps5clear\`

!submitmusic — View payment info  
!mysubmission <link>  
> Example: \`!mysubmission https://sound.link\`
        `)
        .setColor('#00ddff'),

      new EmbedBuilder()
        .setTitle('📈 Stock Tools & Misc')
        .setDescription(`
!snipe — View all sniper tickers  
!track <ticker> — Start tracking  
!sniperlog — View alert log  
!nominate <ticker> — Suggest stock  
!rotate — Manual snipe rotation  
!banktotal — Show total wealth

!roast @user — Roast a player  
> Example: \`!roast @jeffbezos\`
        `)
        .setFooter({ text: 'More chaos coming soon... 🌀' })
        .setColor('#cccccc')
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
      if (interaction.user.id !== message.author.id) return interaction.reply({ content: 'Only you can navigate your help panel.', ephemeral: true });

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
    const drop = getRandomItem();
    if (drop) {
      await addItem(message.author.id, message.guild.id, drop.id);
      message.channel.send(`🪂 <@${message.author.id}> found ${drop.name} (${drop.rarity}) and added it to their inventory!`);
    }
  });

client.login(process.env.DISCORD_TOKEN);



client.commands.set('rank', {
  async execute(message) {
    const user = await Levels.fetch(message.author.id, message.guild.id);
    if (!user) return message.reply("You have no XP yet.");

    message.channel.send(`🧠 ${message.author.username}, you're level ${user.level} with ${user.xp} XP.`);
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


client.commands.set('use', {
  async execute(message, args) {
    const item = args[0]?.toLowerCase();
    if (!item) return message.reply("Usage: `!use item_name`");

    const { addCash } = require('./economy/currency');

    switch(item) {
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
        const Levels = require('discord-xp');
        await removeItem(message.author.id, message.guild.id, item);
        await Levels.appendXp(message.author.id, message.guild.id, xpGain);
        return message.reply(`🎲 Used a Dice! Gained ${xpGain} XP.`);
      default:
        return message.reply("Unknown item.");
    }
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


client.commands.set('challenge', {
  async execute(message, args) {
    const opponent = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!opponent || isNaN(amount)) return message.reply("Usage: `!challenge @user 100`");

    message.channel.send(createChallenge(message, opponent.id, amount));
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
if (hideout && hideout > Date.now()) {
  return message.reply(`🧢 That user is hiding out. You can’t target them right now.`);
}


    const now = Date.now();
    const cooldown = stealCooldowns.get(message.author.id) || 0;
    const timeLeft = cooldown - now;
    if (timeLeft > 0) {
      const seconds = Math.ceil(timeLeft / 1000);
      return message.reply(`⏳ You’re laying low... try again in ${seconds}s.`);
    }

    const targetBalance = await getBalance(target.id, message.guild.id);
    const yourBalance = await getBalance(message.author.id, message.guild.id);
    if (targetBalance < 100) return message.reply("They're too broke to steal from.");

    // ⚖️ Determine success
    const success = Math.random() < 0.5;
    const userId = message.author.id;
    let alertEmbed;

    if (success) {
      const stolen = Math.floor(targetBalance * (Math.random() * 0.2 + 0.1)); // 10–30%
      await removeCash(target.id, message.guild.id, stolen);
      await addCash(userId, message.guild.id, stolen);

      // Reset fail streak
      wantedMap.set(userId, { fails: 0, watched: false });

      alertEmbed = new EmbedBuilder()
        .setTitle("💸 Heist Successful!")
        .setDescription(`**<@${userId}>** stole **$${stolen}** from **<@${target.id}>**!`)
        .setColor("#00ff88")
        .setFooter({ text: 'Crime Success' })
        .setTimestamp();
    } else {
      const lost = Math.floor(yourBalance * (Math.random() * 0.1 + 0.1)); // 10–20%
      await removeCash(userId, message.guild.id, lost);

      // Track failures
      const state = wantedMap.get(userId) || { fails: 0, watched: false };
      state.fails += 1;
      if (state.fails >= 3) state.watched = true;
      wantedMap.set(userId, state);

      alertEmbed = new EmbedBuilder()
        .setTitle("🚨 Failed Robbery!")
        .setDescription(`**<@${userId}>** got caught trying to rob **<@${target.id}>** and lost **$${lost}**.`)
        .setColor("#ff4444")
        .addFields({ name: "Wanted Level", value: state.watched ? "🚨 Watched" : `❌ Failed attempts: ${state.fails}` })
        .setFooter({ text: 'Crime Failure' })
        .setTimestamp();
    }

    message.channel.send({ embeds: [alertEmbed] });
    stealCooldowns.set(userId, now + 5 * 60 * 1000); // 5-min cooldown
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
  async execute(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply("You must tag someone to place a bounty: `!bounty @user`");

    if (target.id === message.author.id) return message.reply("You can’t place a bounty on yourself.");
    
    const targetState = wantedMap.get(target.id);
    if (!targetState || !targetState.watched) {
      return message.reply("That player isn’t being watched by the authorities yet.");
    }

    const hideout = hideoutMap.get(target.id);
if (hideout && hideout > Date.now()) {
  return message.reply(`🧢 That user is currently hiding in a safehouse. Wait until they resurface.`);
}

    const reward = Math.floor(Math.random() * 300) + 200; // $200 - $500
    await addCash(message.author.id, message.guild.id, 100); // Optional: small refund to user for justice
    await removeCash(target.id, message.guild.id, reward);

    const bountyEmbed = new EmbedBuilder()
      .setTitle("🎯 Bounty Placed!")
      .setDescription(`**<@${message.author.id}>** has placed a bounty on **<@${target.id}>**!`)
      .addFields(
        { name: "💥 Reward", value: `$${reward} has been taken from them.`, inline: true },
        { name: "🧨 Reason", value: "Too many failed crimes. Marked as a threat." }
      )
      .setColor("#ff5555")
      .setFooter({ text: "Bounty System Activated" })
      .setTimestamp();

    message.channel.send({ embeds: [bountyEmbed] });

    // Optionally reset the "watched" status after bounty
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

// Run this every 5 minutes
setInterval(() => {
  for (const t of todaySnipes) {
    scanTicker(client, t);
    scanOptionsFlow(client, t);
  }
}, 5 * 60 * 1000);


cron.schedule('0 12 * * *', () => {
  runDailyPredictions(client);
});


setInterval(() => {
  scanAllSnipers(client);
}, 1000 * 60 * 5); // Every 5 minutes

setInterval(() => {
  const now = Date.now();
  for (const [id, end] of hideoutMap.entries()) {
    if (end <= now) hideoutMap.delete(id);
  }
}, 60 * 1000);


app.use('/stripe/webhook', stripeWebhook);
app.use('/paypal/webhook', paypalWebhook);
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Keep-alive server running'));
