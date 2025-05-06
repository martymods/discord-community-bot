// commands/grantbank.js

const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const DealerProfile = require('../economy/dealerProfileModel');

module.exports = {
  name: 'grantbank',
  description: 'ADMIN ONLY — Grant a user access to the Dreamworld Bank system',
  async execute(message) {
    try {
      const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
      if (!isAdmin) {
        return message.reply('🚫 This command is restricted to **admins only**.');
      }

      const target = message.mentions.users.first();
      if (!target) {
        return message.reply('❌ Please mention a user to grant bank access to.');
      }

      // 🔐 Grant bank access in DB
      const profile = await DealerProfile.findOneAndUpdate(
        { userId: target.id, guildId: message.guild.id },
        { $set: { bankAccess: true } },
        { upsert: true, new: true }
      );

      // 📹 Hosted video link from #bank channel
      const videoUrl = 'https://cdn.discordapp.com/attachments/1362182569931571240/1368623508887699616/DW_PointBankAd_0.mp4';

      // 🏦 Welcome embed
      const embed = new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle('🏦 Welcome to the Dreamworld Point Bank')
        .setDescription(`🎉 <@${target.id}>, you've been granted secure **bank access**!\n\nYour money is now protected from raids, theft, and street drama.\n\nUse \`!deposit 10000\` or \`!withdraw 5000\` anytime.`)
        .setImage(videoUrl)
        .setThumbnail('https://cdn.discordapp.com/emojis/1109216995119841360.webp?size=96&quality=lossless')
        .setFooter({ text: 'Dreamworld Bank • Your grind. Protected.' })
        .setTimestamp();

      // 🎬 Send vault unlock message + embed
      await message.channel.send({ content: `🎥 Opening your vault, <@${target.id}>...` });
      await message.channel.send({ embeds: [embed] });

      return message.reply(`✅ Granted bank access to <@${target.id}>.`);
    } catch (err) {
      console.error('❌ grantbank.js error:', err);
      return message.reply('⚠️ Something went wrong while granting bank access.');
    }
  }
};
