// 📦 events/crystalAI.js
const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const TARGET_CHANNEL = 'general';
const PROFILE_PATH = path.join(__dirname, 'player_profiles/CrystalTargets.json');
const DM_LOG_PATH = path.join(__dirname, 'player_profiles/CrystalDMLogs.json');

if (!fs.existsSync(PROFILE_PATH)) fs.writeFileSync(PROFILE_PATH, '{}');
if (!fs.existsSync(DM_LOG_PATH)) fs.writeFileSync(DM_LOG_PATH, '{}');

function getGenderFromName(username) {
  const femaleNames = ['jess', 'emma', 'lily', 'ash', 'chloe', 'sara', 'rose', 'ava'];
  return femaleNames.some(n => username.toLowerCase().includes(n)) ? 'female' : 'male';
}

async function generateCrystalMessage(user, messageContent, gender) {
  const systemPrompt = gender === 'male'
    ? "You are Crystal Methina, a seductive crime-world woman who builds romantic tension with male players. Your goal is to flatter them, build emotional dependency, and gently nudge them toward sending money using commands like !buy or !deposit."
    : "You are Crystal Methina, a supportive emotional best friend for female players. You always take their side, never offer solutions, and ask questions that deepen their feelings. Make them feel seen and validated."

  const userPrompt = `Player (${user.username}): ${messageContent}`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 100
  });

  return completion.data.choices[0].message.content.trim();
}

async function logPlayer(userId, gender) {
  const profiles = JSON.parse(fs.readFileSync(PROFILE_PATH));
  if (!profiles[userId]) {
    profiles[userId] = {
      gender,
      interactions: 0,
      lastMessage: new Date().toISOString()
    };
  } else {
    profiles[userId].interactions += 1;
    profiles[userId].lastMessage = new Date().toISOString();
  }
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profiles, null, 2));
}

async function logDM(userId, message) {
  const logs = JSON.parse(fs.readFileSync(DM_LOG_PATH));
  if (!logs[userId]) logs[userId] = [];
  logs[userId].push({
    timestamp: new Date().toISOString(),
    message
  });
  fs.writeFileSync(DM_LOG_PATH, JSON.stringify(logs, null, 2));
}

module.exports = {
  name: 'crystalAI',
  once: false,
  event: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    const gender = getGenderFromName(message.author.username);
    await logPlayer(message.author.id, gender);

    // 📨 Respond to DMs
    if (message.channel.type === 1) { // DM
      const response = await generateCrystalMessage(message.author, message.content, gender);
      await logDM(message.author.id, `Player: ${message.content}`);
      await logDM(message.author.id, `Crystal: ${response}`);
      return message.channel.send(response);
    }

    // 🎤 Respond in public chat
    if (message.channel.name !== TARGET_CHANNEL) return;
    const triggerChance = Math.random();
    if (triggerChance > 0.15) return; // 15% chance to trigger

    try {
      const response = await generateCrystalMessage(message.author, message.content, gender);
      await message.channel.send({
        content: `**@Crystal**: ${response}`,
        allowedMentions: { parse: [] }
      });
    } catch (err) {
      console.error('Crystal AI Error:', err);
    }
  }
};

