const { Player } = require('discord-player');

module.exports = {
  name: 'play',
  description: 'Play a song from YouTube or Spotify',
  async execute(interaction) {
    const client = interaction.client;

    const player = new Player(client);
    client.player = player; // optionally store on client for reuse

    const query = interaction.options.getString('query');

    const res = await player.search(query, {
      requestedBy: interaction.user,
    });

    if (!res.tracks.length)
      return interaction.reply({ content: '❌ No results found.', ephemeral: true });

    const queue = await player.createQueue(interaction.guild, {
      metadata: interaction.channel,
    });

    try {
      if (!queue.connection) await queue.connect(interaction.member.voice.channel);
    } catch {
      player.deleteQueue(interaction.guild.id);
      return interaction.reply({ content: '❌ Could not join your voice channel!', ephemeral: true });
    }

    await interaction.reply({ content: `⏱️ Loading track...`, ephemeral: true });
    queue.addTrack(res.tracks[0]);
    if (!queue.playing) await queue.play();
  },
};
