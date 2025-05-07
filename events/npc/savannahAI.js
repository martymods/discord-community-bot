// 📦 events/npc/savannahAI.js
const { EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI(); // uses OPENAI_API_KEY from env
const IGNORED_PATH = path.join(__dirname, 'player_profiles/savannahIgnore.json');
const SAVANNAH_IMAGE = 'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/woman_date_3.png';

if (!fs.existsSync(path.dirname(IGNORED_PATH))) fs.mkdirSync(path.dirname(IGNORED_PATH), { recursive: true });
if (!fs.existsSync(IGNORED_PATH)) fs.writeFileSync(IGNORED_PATH, '{}');

function getGender(username) {
  const female = ['jess', 'emma', 'lily', 'ash', 'chloe', 'sara', 'rose', 'ava'];
  return female.some(n => username.toLowerCase().includes(n)) ? 'female' : 'male';
}

async function generateSavannahMessage(user, msg, gender) {
  const prompt = gender === 'male'
    ? `You are Savannah Royale, a rich, confident woman who can do everything on her own. You speak to men in short, direct bursts. You expect them to provide, impress, and respect you. You're loving and generous, but not for long. If ignored, you move on. Speak in the confident, teasing, alpha-feminine style of a Twitter it-girl.

Examples:
- "I like you better when you’re useful."
- "That wasn’t a flex. That was maintenance."
- "You had me at luxury. You lost me at excuses."
- "You know what I like? Results."
- "Act like a provider. Or don’t act at all."

Keep it 1–2 lines. Never narrate. Always own the energy.`

    : `You are Savannah Royale, a high-value, emotionally intelligent woman who talks to other women like a wealthy older sister. You uplift, encourage, and hold them to their potential. You never overextend for people who ignore you.

Examples:
- "You already know your worth. Now live like it."
- "You’re not too much. They’re just not enough."
- "We don’t beg. We bloom."

Always keep responses to 1–2 lines. Speak directly.`

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

function shouldIgnore(userId) {
  const ignores = JSON.parse(fs.readFileSync(IGNORED_PATH));
  if (!ignores[userId]) return false;
  const data = ignores[userId];
  if (data.ignoredUntil && new Date(data.ignoredUntil) > new Date()) return true;
  return false;
}

function trackInteraction(userId) {
  const ignores = JSON.parse(fs.readFileSync(IGNORED_PATH));
  const now = new Date();
  if (!ignores[userId]) {
    ignores[userId] = { count: 1, ignoredUntil: null };
  } else {
    ignores[userId].count += 1;
    if (ignores[userId].count > 3) {
      const blockUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      ignores[userId].ignoredUntil = blockUntil.toISOString();
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

async function execute(message) {
  if (message.author.bot) return;

  const lower = message.content.toLowerCase();
  const trigger = lower.includes('savannah') || lower.includes('royale') || lower.includes('queen');
  const gender = getGender(message.author.username);

  if (shouldIgnore(message.author.id) && !trigger) return;

  if (trigger || Math.random() < 0.18) {
    if (trigger) resetIgnore(message.author.id); else trackInteraction(message.author.id);

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
}

module.exports = {
  name: 'savannahAI',
  once: false,
  event: Events.MessageCreate,
  execute,
  generateSavannahMessage
};
