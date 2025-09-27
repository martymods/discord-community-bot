const mongoose = require('../utils/localMongoose');

const schema = new mongoose.Schema({
  userId: String,
  guildId: String,
  achievements: { type: [String], default: [] }
});

const Achievements = mongoose.model('Achievements', schema);

module.exports = { Achievements };

const { Achievements } = require('./economy/achievements');

async function unlockAchievement(userId, guildId, name, message) {
  const user = await Achievements.findOneAndUpdate(
    { userId, guildId },
    { $addToSet: { achievements: name } },
    { new: true, upsert: true }
  );

  if (user.achievements.includes(name)) return;
  message.channel.send(`🏅 New Achievement Unlocked: ${name}`);
}

client.commands.set('achievements', {
    async execute(message) {
      const { Achievements } = require('./economy/achievements');
      const user = await Achievements.findOne({ userId: message.author.id, guildId: message.guild.id });
      if (!user || !user.achievements.length) return message.reply("No achievements yet.");
      message.reply(`🏆 Your Achievements:\n${user.achievements.join('\n')}`);
    }
  });
