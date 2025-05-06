const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addCash, removeCash, getBalance } = require('../economy/currency');

const droppedMoneyMap = new Map(); // messageId => { amount, userId, target }

module.exports = {
  name: 'dropmoney',
  async execute(message, args) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    const amount = parseInt(args[0]);
    const target = message.mentions.users.first();

    if (isNaN(amount) || amount <= 0) {
      return message.reply("❌ Please provide a valid amount greater than 0.");
    }

    const balance = await getBalance(userId, guildId);
    if (balance < amount) {
      return message.reply("❌ You don't have enough money.");
    }

    await removeCash(userId, guildId, amount);

    let image;
    if (amount >= 1000000) image = 'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/money_100000.png';
    else if (amount >= 10000) image = 'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/money_10000.png';
    else image = 'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/money_1.png';

    const embed = new EmbedBuilder()
      .setTitle("💸 Money Dropped!")
      .setDescription(`${message.author.username} dropped **$${amount}**!${target ? ` Only <@${target.id}> can grab it.` : ''}`)
      .setImage(image)
      .setColor('#00cc99')
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId(`grab_money_${userId}_${amount}`)
      .setLabel('💰 Grab Money')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);
    const sentMsg = await message.channel.send({ embeds: [embed], components: [row] });

    droppedMoneyMap.set(sentMsg.id, {
      amount,
      droppedBy: userId,
      target: target?.id || null
    });
  },

  async handleButton(interaction) {
    const msgId = interaction.message.id;
    const data = droppedMoneyMap.get(msgId);
    if (!data) return interaction.reply({ content: '❌ This money is no longer available.', ephemeral: true });

    const { amount, droppedBy, target } = data;

    if (target && interaction.user.id !== target && interaction.user.id !== droppedBy) {
      return interaction.reply({ content: '❌ You are not allowed to grab this.', ephemeral: true });
    }

    await addCash(interaction.user.id, interaction.guildId, amount);
    droppedMoneyMap.delete(msgId);

    const updated = EmbedBuilder.from(interaction.message.embeds[0])
      .setDescription(`✅ <@${interaction.user.id}> grabbed the **$${amount}**!`);

    await interaction.update({ embeds: [updated], components: [] });
  }
};
