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

const { getInventory } = require('./economy/inventory');

client.commands.set('inventory', {
  async execute(message) {
    const items = await getInventory(message.author.id, message.guild.id);

    if (!items || items.size === 0) return message.reply("Your bag is empty.");

    const itemList = [...items.entries()].map(([item, qty]) => `${item} x${qty}`).join('\n');
    message.reply(`🎒 Your Inventory:\n${itemList}`);
  }
});

const { removeItem } = require('./economy/inventory');

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

const { shopItems } = require('./economy/shop');

client.commands.set('shop', {
  execute(message) {
    const shop = Object.entries(shopItems).map(([key, item]) => `${item.name} - $${item.price} (Command: !buyitem ${key})`).join('\n');
    message.reply(`🛒 Dreamworld Shop:\n${shop}`);
  }
});

const { addItem } = require('./economy/inventory');

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


app.use(express.json());
app.use('/stripe/webhook', stripeWebhook);
app.use('/paypal/webhook', paypalWebhook);
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Keep-alive server running'));
