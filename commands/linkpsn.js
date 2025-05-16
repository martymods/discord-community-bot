const { setPSN } = require('../systems/psnLinkManager');

module.exports = {
  name: 'linkpsn',
  async execute(message, args) {
    const psnId = args[0];
    if (!psnId) return message.reply('🎮 Usage: `!linkpsn your_PSN_username`');

    await setPSN(message.author.id, message.guild.id, psnId);
    return message.reply(`✅ Your PSN account \`${psnId}\` has been linked!`);
  }
};
