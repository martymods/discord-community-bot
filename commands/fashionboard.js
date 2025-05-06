// 📁 commands/fashionboard.js
const { EmbedBuilder } = require('discord.js');
const Fashion = require('../models/FashionModel');

module.exports = {
  name: 'fashionboard',
  async execute(message) {
    const guildId = message.guild.id;
    const fashionUsers = await Fashion.find({ guildId });

    const leaderboard = fashionUsers.map(user => {
      const totalSpent = user.items.reduce((sum, item) => sum + (item.price || 0), 0);
      const totalBuff = user.items.reduce((sum, item) => sum + (item.bonusValue || 0), 0);
      const mostExpensive = user.items.reduce((max, item) =>
        item.price > (max?.price || 0) ? item : max, null);
      return {
        userId: user.userId,
        totalSpent,
        totalBuff,
        mostExpensive
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

    const embed = new EmbedBuilder()
      .setTitle('💎 Fashion Leaderboard')
      .setColor('#ff33aa')
      .setFooter({ text: 'Top 10 fashion spenders (Wardrobe value)' });

    for (const [index, entry] of leaderboard.entries()) {
      const member = await message.guild.members.fetch(entry.userId).catch(() => null);
      const username = member ? member.user.username : `Unknown User`;
      const mostExp = entry.mostExpensive;

      embed.addFields({
        name: `#${index + 1} — ${username}`,
        value:
          `👕 Items Owned: ${fashionUsers.find(f => f.userId === entry.userId)?.items.length || 0}\n` +
          `💰 Total Spent: $${entry.totalSpent}\n` +
          `⭐ Buff Power: +${entry.totalBuff}\n` +
          (mostExp
            ? `🏆 Most Expensive: **${mostExp.name}** ($${mostExp.price})\nBuff: +${mostExp.bonusValue} ${mostExp.bonusStat}`
            : ''),
        inline: false
      });
    }

    message.channel.send({ embeds: [embed] });
  }
};

