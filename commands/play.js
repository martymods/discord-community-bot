const { QueryType, Player } = require('discord-player');
const { joinVoiceChannel } = require('@discordjs/voice');
const player = new Player();

module.exports = {
  name: 'play',
  description: 'Play a song from YouTube or Spotify in a voice channel.',
  async execute(message, args) {
    const query = args.join(' ');
    if (!query) return message.reply('Please provide a song name or link.');

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('You must be in a voice channel.');

    const queue = player.createQueue(message.guild.id);
    await queue.connect(voiceChannel);

    const searchResult = await player.search(query, {
      requestedBy: message.author,
      searchEngine: QueryType.AUTO
    });

    if (!searchResult.tracks.length) return message.reply('No results found.');

    queue.addTrack(searchResult.tracks[0]);
    if (!queue.playing) await queue.play();

    return message.channel.send(`🎶 Now playing: **${searchResult.tracks[0].title}**`);
  }
};
