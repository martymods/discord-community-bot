// 📦 events/crystalAI.js
const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI(); // ✅ new SDK automatically uses OPENAI_API_KEY from env


const TARGET_CHANNEL = 'general';
const PROFILE_PATH = path.join(__dirname, 'player_profiles/CrystalTargets.json');
const DM_LOG_PATH = path.join(__dirname, 'player_profiles/CrystalDMLogs.json');

// Ensure folders exist
const profileDir = path.dirname(PROFILE_PATH);
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
if (!fs.existsSync(PROFILE_PATH)) fs.writeFileSync(PROFILE_PATH, '{}');
if (!fs.existsSync(DM_LOG_PATH)) fs.writeFileSync(DM_LOG_PATH, '{}');

function getGenderFromName(username) {
  const femaleNames = ['jess', 'emma', 'lily', 'ash', 'chloe', 'sara', 'rose', 'ava'];
  return femaleNames.some(n => username.toLowerCase().includes(n)) ? 'female' : 'male';
}

async function generateCrystalMessage(user, messageContent, gender) {
  try {
    const systemPrompt = gender === 'male'
      ? "You are Crystal Methina, a seductive crime-world woman who builds romantic tension with male players..."
      : "You are Crystal Methina, a supportive emotional best friend for female players...";

    const userPrompt = `Player (${user.username}): ${messageContent}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 100
    });

    return completion.choices?.[0]?.message?.content?.trim() || '...';
  } catch (err) {
    console.error('❌ OpenAI API Error:', err);
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

  // 📨 Respond to DMs
  if (message.channel.type === 1) {
    const response = await generateCrystalMessage(message.author, message.content, gender);
    await logDM(message.author.id, `Player: ${message.content}`);
    await logDM(message.author.id, `Crystal: ${response}`);
    return message.channel.send(response);
  }

  // 🎤 Respond in public
  if (message.channel.name !== TARGET_CHANNEL) return;
  const triggerChance = Math.random();
  if (triggerChance > 0.15) return;

  try {
    const response = await generateCrystalMessage(message.author, message.content, gender);
    await message.channel.send({
      content: `**@Crystal**: ${response}`,
      allowedMentions: { parse: [] }
    });
  } catch (err) {
    console.error('❌ Crystal Public Chat Error:', err);
  }
}

module.exports = {
  name: 'crystalAI',
  once: false,
  event: Events.MessageCreate,
  execute,
  generateCrystalMessage // ✅ Now exported properly
};
