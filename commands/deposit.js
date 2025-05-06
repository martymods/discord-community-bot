// commands/deposit.js
const DealerProfile = require('../economy/dealerProfileModel');
const { Currency } = require('../economy/currency');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'deposit',
  description: 'Deposit money into your bank account.',
  async execute(message, args) {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) return message.reply('❌ Enter a valid amount.');

    const profile = await DealerProfile.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!profile || !profile.bankAccess) return message.reply('❌ You do not have access to bank features.');

    const userCurrency = await Currency.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!userCurrency || userCurrency.cash < amount) return message.reply('❌ Not enough funds.');

    await Currency.updateOne(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { cash: -amount } }
    );

    profile.bankBalance = (profile.bankBalance || 0) + amount;
    await profile.save();

    const receiptImage = new AttachmentBuilder('public/sharedphotos/DreamPointBank0.gif');

    const embed = new EmbedBuilder()
      .setTitle('🏦 Dreamworld Bank Deposit Receipt')
      .setDescription(`💵 You successfully deposited **$${amount.toLocaleString()}** into your bank account.`)
      .addFields(
        { name: '🧾 New Balance', value: `$${profile.bankBalance.toLocaleString()}`, inline: true },
        { name: '📅 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
      )
      .setImage('attachment://DreamPointBank0.gif')
      .setColor('#00ff88')
      .setFooter({ text: 'Dreamworld Bank • Your grind. Protected.' });

    await message.reply({ embeds: [embed], files: [receiptImage] });
  }
};
