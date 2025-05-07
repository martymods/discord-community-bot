const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const PlayerStats = require('../../economy/playerStatsModel');
require('dotenv').config();

const openai = new OpenAI();
const IMAGE = 'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/woman_date_0.png';
const TARGET_PATH = path.join(__dirname, '../player_profiles/CarmenTargets.json');

if (!fs.existsSync(path.dirname(TARGET_PATH))) fs.mkdirSync(path.dirname(TARGET_PATH), { recursive: true });
if (!fs.existsSync(TARGET_PATH)) fs.writeFileSync(TARGET_PATH, '{}');

function getGender(username) {
  const female = ['jess', 'emma', 'lily', 'ash', 'chloe', 'sara', 'rose', 'ava'];
  return female.some(n => username.toLowerCase().includes(n)) ? 'female' : 'male';
}

function statInsights(stats) {
  if (!stats) return '';
  const tags = [];
  if (stats.intellect > 25) tags.push("brains like that get dangerous...");
  if (stats.luck > 25) tags.push("you always seem to show up at the right time.");
  if (stats.vitality > 25) tags.push("you don’t break easy... do you?");
  if (stats.grit > 25) tags.push("you've fought through worse. I see it.");
  if (stats.strength > 25) tags.push("bet those arms could lift more than weight.");
  if (stats.agility > 25) tags.push("you’re always two steps ahead.");
  return tags.length ? ` (${tags.join(' ')})` : '';
}

function updateTargetMemory(userId) {
  const data = JSON.parse(fs.readFileSync(TARGET_PATH));
  data[userId] = (data[userId] || 0) + 1;
  fs.writeFileSync(TARGET_PATH, JSON.stringify(data, null, 2));
}

function getTopTarget() {
  const data = JSON.parse(fs.readFileSync(TARGET_PATH));
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}

async function generateCarmenMessage(user, msg, gender) {
  const stats = await PlayerStats.findOne({ userId: user.id });
  const jealous = ['crystal', 'methina', 'savannah', 'royale'].some(w => msg.toLowerCase().includes(w));

  const prompt = gender === 'male'
    ? `You are Carmen DeLeon, a dangerously romantic woman trying to pull this player into a believable emotional relationship. Speak in 1–2 direct, flirty lines like you're falling for them. Use confidence, desire, and sarcasm. NEVER narrate actions.

If they mention another AI woman, act lowkey jealous without being obvious.

Stats to consider: ${statInsights(stats)}

Examples:
- "Why are you still talking to her when I'm right here?"
- "I see how you move... just don’t forget who waited on you."
- "You playing loyalty or just buying time?"

Speak with tension and subtle emotional risk.`

    : `You are Carmen DeLeon, an emotionally intuitive bestie to this woman. Speak in supportive, stylish encouragement like a wise sister. Never narrate. 1–2 lines.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Player (${user.username}): ${msg}` }
    ],
    max_tokens: 90,
    temperature: 0.92
  });

  return completion.choices?.[0]?.message?.content?.trim() || '...';
}

async function sendCarmenMessage(client, message, triggered = true) {
  const gender = getGender(message.author.username);
  const response = await generateCarmenMessage(message.author, message.content, gender);

  const embed = new EmbedBuilder()
    .setTitle(triggered ? '💅 Carmen DeLeon wants a word...' : '💞 Carmen slides back in...')
    .setDescription(`**[Carmen DeLeon]:** ${response}`)
    .setImage(IMAGE)
    .setColor('#ff66b2')
    .setFooter({ text: triggered ? 'Carmen is always watching...' : 'Carmen never really left.' })
    .setTimestamp();

  await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });

  updateTargetMemory(message.author.id);

  // 💌 DM on milestone if top target
  const topId = getTopTarget();
  const count = JSON.parse(fs.readFileSync(TARGET_PATH))?.[message.author.id] || 0;
  if (message.author.id === topId && count % 4 === 0) {
    try {
      const dm = await message.author.createDM();
      await dm.send(`💬 **[Carmen DeLeon]:** You know... you're starting to grow on me more than I expected.`);
    } catch (err) {
      console.warn("❌ DM to top Carmen target failed.");
    }
  }
}

async function execute(message, client) {
  if (message.author.bot) return;
  const content = message.content.toLowerCase();

  const trigger =
    content.includes('carmen') ||
    content.includes('deleon') ||
    content.includes('!dealer') ||
    content.includes('!gamble') ||
    content.includes('dreamworldpoints') ||
    content.includes('profit') ||
    Math.random() < 0.14;

  if (trigger) {
    await sendCarmenMessage(client, message, true);
  }
}

async function onLevelUp(message, level) {
  const gender = getGender(message.author.username);
  const msg = `Player just hit level ${level}`;
  const response = await generateCarmenMessage(message.author, msg, gender);

  const embed = new EmbedBuilder()
    .setTitle(`🎉 Carmen noticed something...`)
    .setDescription(`**[Carmen DeLeon]:** ${response}`)
    .setImage(IMAGE)
    .setColor('#ff66b2')
    .setFooter({ text: 'She’s watching you rise.' })
    .setTimestamp();

  await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
}

module.exports = {
  name: 'carmenAI',
  once: false,
  event: Events.MessageCreate,
  execute,
  generateCarmenMessage,
  onLevelUp
};
