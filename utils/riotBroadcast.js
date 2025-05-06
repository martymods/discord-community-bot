const { EmbedBuilder } = require('discord.js');

function broadcastRiot(client, channelId, username, userAvatarURL) {
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("🔥 Prison Riot Escalating!")
    .setDescription(`🚨 Inmate **${username}** is inciting chaos behind bars.\nSecurity may be compromised across the entire server...`)
    .setColor("#ff2222")
    .setThumbnail(userAvatarURL)
    .setFooter({ text: "Riot feed monitored by Warden Systems" })
    .setTimestamp();

  channel.send({ embeds: [embed] });
}

module.exports = { broadcastRiot };
