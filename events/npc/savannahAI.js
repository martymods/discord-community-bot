// 📦 events/npc/savannahAI.js
const { EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const PlayerStats = require('../../economy/playerStatsModel'); // ✅ Correct path
require('dotenv').config();

const openai = new OpenAI();
const IGNORED_PATH = path.join(__dirname, 'player_profiles/savannahIgnore.json');
const SAVANNAH_IMAGE = 'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/woman_throne_0.png';

if (!fs.existsSync(path.dirname(IGNORED_PATH))) fs.mkdirSync(path.dirname(IGNORED_PATH), { recursive: true });
if (!fs.existsSync(IGNORED_PATH)) fs.writeFileSync(IGNORED_PATH, '{}');

function getGender(username) {
  const female = ['jess', 'emma', 'lily', 'ash', 'chloe', 'sara', 'rose', 'ava'];
  return female.some(n => username.toLowerCase().includes(n)) ? 'female' : 'male';
}

function shouldIgnore(userId) {
  const ignores = JSON.parse(fs.readFileSync(IGNORED_PATH));
  if (!ignores[userId]) return false;
  const data = ignores[userId];
  return data.ignoredUntil && new Date(data.ignoredUntil) > new Date();
}

function trackInteraction(userId) {
  const ignores = JSON.parse(fs.readFileSync(IGNORED_PATH));
  const now = new Date();
  if (!ignores[userId]) {
    ignores[userId] = { count: 1, ignoredUntil: null };
  } else {
    ignores[userId].count += 1;
    if (ignores[userId].count > 3) {
      ignores[userId].ignoredUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    }
  }
  fs.writeFileSync(IGNORED_PATH, JSON.stringify(ignores, null, 2));
}

function resetIgnore(userId) {
  const ignores = JSON.parse(fs.readFileSync(IGNORED_PATH));
  if (ignores[userId]) {
    ignores[userId].count = 0;
    ignores[userId].ignoredUntil = null;
    fs.writeFileSync(IGNORED_PATH, JSON.stringify(ignores, null, 2));
  }
}

async function generateSavannahMessage(user, msg, gender) {
  const prompt = gender === 'male'
    ? `You are Savannah Royale, a rich, confident woman who can do everything on her own. Speak to men in short, direct bursts. Speak like a flirty, alpha-feminine Twitter it-girl. 1–2 lines. Never narrate. Always stay composed and powerful.`
    : `You are Savannah Royale, a high-value woman who speaks to other women like a wise sister. Speak clearly, generously, with short powerful encouragement. 1–2 lines max.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Player (${user.username}): ${msg}` }
    ],
    max_tokens: 80,
    temperature: 0.9
  });

  return completion.choices?.[0]?.message?.content?.trim() || '...';
}

async function depositResponse(user, amount) {
  if (amount < 1001) return null;

  // 🧮 Check player profit first
  let legitProfit = false;
  try {
    const stats = await PlayerStats.findOne({ userId: user.id });
    if (stats?.lastProfitAmount && amount <= stats.lastProfitAmount) {
      legitProfit = true;
    }
  } catch (err) {
    console.error('❌ SavannahAI profit check failed:', err);
  }

  if (!legitProfit) return null; // Skip hype if not from real profit

  const midTier = amount <= 100000;
  const compliments = midTier
    ? [
        "Smart move. That’s how you protect your shine.",
        "Mmm, I see you being responsible. I like that.",
        "Now *that’s* a money mindset.",
        "Banked it like a boss. I’m watching."
      ]
    : [
        "Oh, you really got it like that huh?",
        "That’s power money. I'm impressed.",
        "Don’t play with them. Deposit like royalty.",
        "The vault stays glowing when you're around."
      ];

  const chosen = compliments[Math.floor(Math.random() * compliments.length)];

  const embed = new EmbedBuilder()
    .setTitle('🏦 Savannah Royale sees your deposit...')
    .setDescription(`**[Savannah]:** ${chosen}`)
    .setImage(SAVANNAH_IMAGE)
    .setColor('#f5b041')
    .setFooter({ text: 'She respects financial discipline.' })
    .setTimestamp();

  return { content: `<@${user.id}>`, embeds: [embed] };
}

async function execute(message) {
  if (message.author.bot) return;

  const lower = message.content.toLowerCase();
  const gender = getGender(message.author.username);
  const trigger = lower.includes('savannah') || lower.includes('royale') || lower.includes('queen');

  if (shouldIgnore(message.author.id) && !trigger) return;

  // 🔮 Name-triggered or chance-based engagement
  if (trigger || Math.random() < 0.18) {
    if (trigger) resetIgnore(message.author.id);
    else trackInteraction(message.author.id);

    try {
      const response = await generateSavannahMessage(message.author, message.content, gender);
      const embed = new EmbedBuilder()
        .setTitle('👑 Savannah Royale makes an entrance...')
        .setDescription(`**[Savannah]:** ${response}`)
        .setImage(SAVANNAH_IMAGE)
        .setColor('#f5b041')
        .setFooter({ text: 'Savannah doesn’t wait. She upgrades.' })
        .setTimestamp();

      await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
    } catch (err) {
      console.error('❌ SavannahAI error:', err);
    }
  }

  // 💰 Deposit detection
  if (lower.startsWith('!deposit')) {
    const parts = lower.split(' ');
    const amount = parseInt(parts[1]?.replace(/[^\d]/g, ''));
    if (!isNaN(amount)) {
      const res = await depositResponse(message.author, amount);
      if (res) await message.channel.send(res);
    }
  }

  // 🔔 Hype them to deposit if risky behavior spotted
  const dangerWords = ['!buy', '!dealer', '!flip', 'just hit', 'made', 'earned', 'sold', 'profit'];
  if (dangerWords.some(w => lower.includes(w)) && !lower.includes('!deposit')) {
    if (Math.random() < 0.25) {
      const warnLines = [
        "Hope you’re not walking around with that cash, baby. Someone’s always watching.",
        "You better put that money away. Brokeboys love a target.",
        "Made it? Good. Now don’t be dumb — deposit it.",
        "We don’t flex. We secure. !deposit, darling."
      ];
      const chosen = warnLines[Math.floor(Math.random() * warnLines.length)];

      const embed = new EmbedBuilder()
        .setTitle('👀 Savannah notices something...')
        .setDescription(`**[Savannah]:** ${chosen}`)
        .setImage(SAVANNAH_IMAGE)
        .setColor('#f5b041')
        .setFooter({ text: 'Even rich girls play safe.' })
        .setTimestamp();

      await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
    }
  }
}

module.exports = {
  name: 'savannahAI',
  once: false,
  event: Events.MessageCreate,
  execute,
  generateSavannahMessage
};
