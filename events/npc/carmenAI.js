// 📦 events/npc/carmenAI.js
const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI(); // uses OPENAI_API_KEY
const TARGET_CHANNEL = 'general';
const PROFILE_PATH = path.join(__dirname, '../player_profiles/CarmenTargets.json');
const DM_LOG_PATH = path.join(__dirname, '../player_profiles/CarmenDMLogs.json');
const CARMEN_IMAGE = 'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/woman_date_0.png';

if (!fs.existsSync(path.dirname(PROFILE_PATH))) fs.mkdirSync(path.dirname(PROFILE_PATH), { recursive: true });
if (!fs.existsSync(PROFILE_PATH)) fs.writeFileSync(PROFILE_PATH, '{}');
if (!fs.existsSync(DM_LOG_PATH)) fs.writeFileSync(DM_LOG_PATH, '{}');

function getGenderFromName(username) {
  const femaleNames = ['jess', 'emma', 'lily', 'ash', 'chloe', 'sara', 'rose', 'ava'];
  return femaleNames.some(n => username.toLowerCase().includes(n)) ? 'female' : 'male';
}

async function generateCarmenMessage(user, messageContent, gender) {
  try {
    const systemPrompt = gender === 'male'
      ? `You are Carmen DeLeon, a spicy, dominant woman who speaks to male players in bold, flirty one-liners. You never narrate actions. You flirt, tease, and provoke in 1–2 sentence bursts. You sound like a confident baddie on Twitter.

Examples:
- "If you can't handle the heat, why are you in my DMs?"
- "You love girls like me until we don’t love you back."
- "I don’t chase. I replace."
- "Be obsessed or be invisible."
- "You’re lucky I even answered."
- "Don’t talk about pressure if you fold quick."
- "I know I’m your weakness. Don’t lie to yourself."

Speak with attitude, confidence, and sexual tension. No storytelling. No setup. Just spicy bait.`

      : `You are Carmen DeLeon, a fierce and supportive bestie to female players. Speak in sharp, empowering Twitter-style lines. Keep it real, raw, and boss-level. Validate their feelings without fixing them. Use spiritual or savage energy to affirm.

Examples:
- "If it costs your peace, it’s too damn expensive."
- "You didn’t lose them, they lost *you*."
- "Don’t shrink to make anyone comfortable."
- "You were never too much. They were just never enough."
- "You’re not cold. You’re healing out loud."
- "You already won, sis. They just don’t know it yet."

Keep it short, direct, and emotionally wise.`

    const userPrompt = `Player (${user.username}): ${messageContent}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 80,
      temperature: 0.92
    });

    return completion.choices?.[0]?.message?.content?.trim() || '...';
  } catch (err) {
    console.error('❌ Carmen AI Error:', err?.response?.data || err);
    return 'Carmen’s too good to reply right now.';
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
    console.error('❌ Failed to log Carmen player:', err);
  }
}

async function logDM(userId, message) {
  try {
    const logs = JSON.parse(fs.readFileSync(DM_LOG_PATH));
    if (!logs[userId]) logs[userId] = [];
    logs[userId].push({ timestamp: new Date().toISOString(), message });
    fs.writeFileSync(DM_LOG_PATH, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('❌ Failed to log Carmen DM:', err);
  }
}

async function shouldTriggerCarmen(message) {
    const lowered = message.content.toLowerCase();
    return (
      lowered.includes('!dealer') ||
      lowered.includes('!gamble') ||
      lowered.includes('scratch') ||
      lowered.includes('won') ||
      lowered.includes('$') ||
      lowered.includes('DreamworldPoints') ||
      lowered.includes('stash') ||
      lowered.includes('blackjack') ||
      lowered.includes('dice') ||
      lowered.includes('ticket') ||
      lowered.includes('you won') ||
      lowered.includes('!buy') ||
      lowered.includes('!flip')
    );
  }
  
  async function execute(message) {
    if (message.author.bot) return;
  
    const gender = getGenderFromName(message.author.username);
    await logPlayer(message.author.id, gender);
  
    // 💬 Always respond to DMs
    if (message.channel.type === 1) {
      const response = await generateCarmenMessage(message.author, message.content, gender);
      await logDM(message.author.id, `Player: ${message.content}`);
      await logDM(message.author.id, `Carmen: ${response}`);
      return message.channel.send(response);
    }
  
    // 🎤 React to drug dealing, gambling, and stash gains
    const trigger = await shouldTriggerCarmen(message);
    if (!trigger && Math.random() > 0.12) return; // ~12% passive trigger chance otherwise
  
    try {
      const response = await generateCarmenMessage(message.author, message.content, gender);
  
      const embed = new EmbedBuilder()
        .setTitle(`💅 Carmen DeLeon wants a word...`)
        .setDescription(`**[Carmen DeLeon]:** ${response}`)
        .setImage('https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/woman_date_0.png')
        .setColor('#ff66b2')
        .setFooter({ text: 'Carmen is always watching...' })
        .setTimestamp();
  
      await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
    } catch (err) {
      console.error('❌ Carmen Public Chat Error:', err);
    }
  }
  

module.exports = {
  name: 'carmenAI',
  once: false,
  event: Events.MessageCreate,
  execute,
  generateCarmenMessage
};
