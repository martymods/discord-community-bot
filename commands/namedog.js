// commands/namedog.js
const { getDog, updateDogName } = require('../events/npc/defense/dogSystem');

module.exports = {
  name: 'namedog',
  description: 'Name your loyal guard dog',
  async execute(message, args) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    const newName = args.join(' ').trim();
    if (!newName || newName.length > 20) {
      return message.reply('❌ Please provide a valid dog name under 20 characters.');
    }

    const dog = await getDog(userId, guildId);
    if (!dog) {
      return message.reply("🐶 You don't have a dog yet. Use `!buydog` to adopt one.");
    }

    await updateDogName(userId, guildId, newName);

    return message.reply(`✅ Your dog is now named **${newName}**! What a good pup 🐾`);
  }
};
