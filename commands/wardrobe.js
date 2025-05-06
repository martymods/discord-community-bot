// 📁 commands/wardrobe.js
const { EmbedBuilder } = require('discord.js');
const FashionModel = require('../models/FashionModel');

module.exports = {
  name: 'wardrobe',
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    const profile = await FashionModel.findOne({ userId, guildId });

    if (!profile || !profile.items.length) {
      return message.reply("🚫 You haven't purchased any fashion items yet.");
    }

    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username}'s 🧥 Wardrobe`)
      .setDescription(`Collected pieces with buffs. Style = Status.`)
      .setColor('#a29bfe');

    profile.items.slice(0, 10).forEach(item => {
      embed.addFields({
        name: `🧵 ${item.name}`,
        value: `Brand: **${item.brand}**\nBuff: **+${item.bonusValue} ${item.bonusStat}**\nPrice: $${item.price}`,
        inline: false
      });
    });

    message.channel.send({ embeds: [embed] });
  }
};
