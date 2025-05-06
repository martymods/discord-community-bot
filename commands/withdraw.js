// commands/withdraw.js
const DealerProfile = require('../economy/dealerProfileModel');
const { Currency } = require('../economy/currency');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'withdraw',
  description: 'Withdraw money from your bank account.',
  async execute(message, args) {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) return message.reply('❌ Enter a valid amount.');

    const profile = await DealerProfile.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!profile || !profile.bankAccess) return message.reply('❌ You do not have access to bank features.');
    if ((profile.bankBalance || 0) < amount) return message.reply('❌ Not enough in your bank.');

    await Currency.updateOne(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { cash: amount } }
    );

    profile.bankBalance -= amount;
    await profile.save();

    const receiptImage = new AttachmentBuilder('public/sharedphotos/DreamPointBank0.gif');

    const embed = new EmbedBuilder()
      .setTitle('🏦 Dreamworld Bank Withdrawal Receipt')
      .setDescription(`💸 You successfully withdrew **$${amount.toLocaleString()}** from your bank account.`)
      .addFields(
        { name: '🧾 New Balance', value: `$${profile.bankBalance.toLocaleString()}`, inline: true },
        { name: '📅 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
      )
      .setImage('attachment://DreamPointBank0.gif')
      .setColor('#ff5555')
      .setFooter({ text: 'Dreamworld Bank • Your grind. Protected.' });

    await message.reply({ embeds: [embed], files: [receiptImage] });
  }
};
