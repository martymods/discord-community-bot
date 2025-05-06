const { EmbedBuilder } = require('discord.js');
const { getPlayerStats, syncStatPointsWithLevel } = require('./utils/statUtils');
const buildStatButtons = require('./components/statsButtons');
const Levels = require('discord-xp');

module.exports = {
  name: 'stats',
  async execute(message) {
    try {
      const userId = message.author.id;
      const guildId = message.guild.id;
  
      const levelData = await Levels.fetch(userId, guildId);
      const level = levelData?.level || 1;
  
      // ✅ Make sure stat points align with level
      await syncStatPointsWithLevel(userId, guildId, level);
  
      const rawStats = await getPlayerStats(userId, guildId);
  
      // ✅ Fallback defaults (to handle missing keys)
      const defaultStats = {
        strength: 0,
        agility: 0,
        grit: 0,
        luck: 0,
        intellect: 0,
        vitality: 0,
        points: 0
      };
  
      const stats = { ...defaultStats, ...(rawStats._doc || rawStats) }; // Mongoose merge-safe
  
      const rows = buildStatButtons(userId, stats.points);
  
      const statEmbed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s Stats`)
        .setDescription(`You have **${stats.points}** stat points to spend.`)
        .addFields([
          { name: '💪 Strength', value: `**${stats.strength}**`, inline: true },
          { name: '🦶 Agility', value: `**${stats.agility}**`, inline: true },
          { name: '💥 Grit', value: `**${stats.grit}**`, inline: true },
          { name: '🍀 Luck', value: `**${stats.luck}**`, inline: true },
          { name: '🧠 Intellect', value: `**${stats.intellect}**`, inline: true },
          { name: '❤️ Vitality', value: `**${stats.vitality}**`, inline: true }
        ])
        .setColor('#ffaa00');
  
      await message.channel.send({
        embeds: [statEmbed],
        components: rows
      });
  
    } catch (err) {
      console.error('❌ Error in stats command:', err);
      message.reply('❌ Something went wrong showing your stats.');
    }
  }
  
};
