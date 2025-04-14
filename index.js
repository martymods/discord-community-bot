const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

const Levels = require("discord-xp");
Levels.setURL(process.env.MONGODB_URI); // Using same MongoDB

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
  execute(message) {
    message.channel.send('Available commands: `!ping`, `!help`, `!kick @user`, `!ban @user`, `!buy`, `!myorders`, `!balance`, `!daily`, `!flip heads/tails amount`, `!slots amount`, `!rank`, `!leaderboard`, `!roast @user`');
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

// Bot Ready
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// Message Handler
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();
  
  const randomXP = Math.floor(Math.random() * 10) + 5;
  await Levels.appendXp(message.author.id, message.guild.id, randomXP);
  
  if (client.commands.has(command)) {
    client.commands.get(command).execute(message, args);
  }
  


const drop = getRandomItem();
if (drop) {
  await addItem(message.author.id, message.guild.id, drop.id);
  message.channel.send(`🪂 <@${message.author.id}> found ${drop.name} (${drop.rarity}) and added it to their inventory!`);
}

});

client.login(process.env.DISCORD_TOKEN);

// Webhooks & Keep Alive
const express = require('express');
const app = express();
const stripeWebhook = require('./payments/stripe');
const paypalWebhook = require('./payments/paypal');

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

app.use(express.json());
app.use('/stripe/webhook', stripeWebhook);
app.use('/paypal/webhook', paypalWebhook);
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Keep-alive server running'));
