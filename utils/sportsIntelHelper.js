const SPORTS_CHANNEL_NAME = 'sports-intel';

function sendToSportsIntel(client, guildId, content) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.find(c => c.name === SPORTS_CHANNEL_NAME);
  if (channel) channel.send(content);
}

module.exports = { sendToSportsIntel };
