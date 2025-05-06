// 📦 events/crystalAI.js
const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI(); // Uses OPENAI_API_KEY from environment
const TARGET_CHANNEL = 'general';
const PROFILE_PATH = path.join(__dirname, 'player_profiles/CrystalTargets.json');
const DM_LOG_PATH = path.join(__dirname, 'player_profiles/CrystalDMLogs.json');
const CRYSTAL_IMAGE = 'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/mule_meth_0.png';

if (!fs.existsSync(path.dirname(PROFILE_PATH))) fs.mkdirSync(path.dirname(PROFILE_PATH), { recursive: true });
if (!fs.existsSync(PROFILE_PATH)) fs.writeFileSync(PROFILE_PATH, '{}');
if (!fs.existsSync(DM_LOG_PATH)) fs.writeFileSync(DM_LOG_PATH, '{}');

function getGenderFromName(username) {
  const femaleNames = ['jess', 'emma', 'lily', 'ash', 'chloe', 'sara', 'rose', 'ava'];
  return femaleNames.some(n => username.toLowerCase().includes(n)) ? 'female' : 'male';
}

async function generateCrystalMessage(user, messageContent, gender) {
  try {
    const systemPrompt = gender === 'male'
      ? `You are Crystal Methina, a seductive, confident woman from the crime world. Speak directly to male players using flirty, teasing one-liners like a spicy Twitter girl. Keep it to 1–2 sentences max. Never narrate your actions or describe scenes — just deliver punchy, suggestive, emotionally manipulative lines that make him feel like you're locked in. Use this style:

Examples:
- "You talk like you run things. Baby, I *am* things."
- "Bet you screenshot everything I say like it’s gospel."
- "You’re not dangerous, you’re just addicted to me."
- "Don't act shy now. You wanted this smoke."
- "Prove it. Or was that just bark?"
- "Don’t start what you can’t finish, baby."
- "Every message you send tells me how bad you want it."
- "You really tryna impress me? Try harder."

Keep responses direct, personal, and dripping with confident sarcasm or flirtation. No setup, no story, just heat.`
      : `You are Crystal Methina, an emotionally intuitive best friend to female players. Speak like a protective, spiritual sister. Always speak directly, in 1–2 sentence bursts. Validate feelings without solving anything. Draw from deep emotional tone and energy vibes.

Examples:
- "That gut feeling? Trust it. Every single time."
- "You already know the truth, sis. I’m just saying it out loud."
- "Your softness isn’t a weakness. It’s your edge."
- "You don’t have to explain yourself to anyone who isn’t listening anyway."
- "Let them think they got away with it. Your elevation is louder than revenge."

Never narrate or tell stories. Stay in-character as an emotionally grounded woman who *sees through the noise* and affirms the player’s worth.`

    const userPrompt = `Player (${user.username}): ${messageContent}`;

    console.log('🔍 Sending OpenAI message with:', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 80,
      temperature: 0.9
    });

    return completion.choices?.[0]?.message?.content?.trim() || '...';
  } catch (err) {
    console.error('❌ OpenAI API Error:', err?.response?.data || err);
    return 'Crystal had a moment... try again later.';
  }
}


async function logPlayer(userId, gender) {
  try {
    const profiles = JSON.parse(fs.readFileSync(PROFILE_PATH));
    if (!profiles[userId]) {
      profiles[userId] = { gender, interactions: 0, lastMessage: new Date().toISOString() };
    } else {
      profiles[userId].interactions += 1;
      profiles[userId].lastMessage = new Date().toISOString();
    }
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(profiles, null, 2));
  } catch (err) {
    console.error('❌ Failed to log player:', err);
  }
}

async function logDM(userId, message) {
  try {
    const logs = JSON.parse(fs.readFileSync(DM_LOG_PATH));
    if (!logs[userId]) logs[userId] = [];
    logs[userId].push({ timestamp: new Date().toISOString(), message });
    fs.writeFileSync(DM_LOG_PATH, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('❌ Failed to log DM:', err);
  }
}

async function execute(message) {
  if (message.author.bot) return;
  const gender = getGenderFromName(message.author.username);
  await logPlayer(message.author.id, gender);

  // 📨 DMs
  if (message.channel.type === 1) {
    const response = await generateCrystalMessage(message.author, message.content, gender);
    await logDM(message.author.id, `Player: ${message.content}`);
    await logDM(message.author.id, `Crystal: ${response}`);
    return message.channel.send(response);
  }

  // 🗣️ Public Trigger
  if (message.channel.name !== TARGET_CHANNEL) return;
  const triggerChance = Math.random();
  if (triggerChance > 0.15) return;

  try {
    const response = await generateCrystalMessage(message.author, message.content, gender);
    const embed = new EmbedBuilder()
      .setTitle('💎 Crystal Methina wants a word...')
      .setDescription(`**[Crystal Methina]:** ${response}`)
      .setImage(CRYSTAL_IMAGE)
      .setColor('#ff33cc')
      .setFooter({ text: 'Crystal is always watching...' })
      .setTimestamp();

    await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
  } catch (err) {
    console.error('❌ Crystal Public Chat Error:', err);
  }
}

module.exports = {
  name: 'crystalAI',
  once: false,
  event: Events.MessageCreate,
  execute,
  generateCrystalMessage
};
