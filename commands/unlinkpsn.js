const PSNLink = require('../systems/psnLinkManager');

module.exports = {
  name: 'unlinkpsn',
  async execute(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    await PSNLink.removePSN(userId, guildId);
    return message.reply("❌ Your PSN account has been unlinked.");
  }
};
