const { hasPaidForSubmission } = require('../economy/musicPayCheck');
const MusicOrders = require('../models/musicorders.js');
const ytdl = require('ytdl-core'); // install this with npm if not present

module.exports = {
  name: 'submitmusic',
  description: 'Submit a music link after payment.',
  async execute(message, args) {
    const url = args[0];
    if (!url || (!url.includes('youtube.com') && !url.includes('soundcloud.com'))) {
      return message.reply('Please submit a valid YouTube or SoundCloud link.');
    }

    const paid = await hasPaidForSubmission(message.author.id, message.guild.id);
    if (!paid) return message.reply('You haven’t paid for a music submission yet.');

    const order = await MusicOrders.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (order.submitted) return message.reply('You’ve already submitted a song for this payment.');

    order.submitted = true;
    await order.save();

    const queueChannel = message.guild.channels.cache.find(c => c.name === 'art-submission');
    if (!queueChannel) return message.reply('Submission channel not found.');

    await queueChannel.send({
      content: `🎵 New submission by <@${message.author.id}>:\n${url}`
    });

    message.reply('✅ Your track has been submitted!');
  }
};
