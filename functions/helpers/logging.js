// /functions/helpers/logging.js

function sendToSportsIntel(client, guildId, message) {
    try {
      const sportsChannel = client.channels.cache.find(c =>
        c.name.includes('sports-intel') && c.guild && c.guild.id === guildId
      );
  
      if (sportsChannel) {
        sportsChannel.send(`📡 [Intel] ${message}`);
      } else {
        console.warn(`[SPORTS INTEL] Channel not found in guild ${guildId}`);
      }
    } catch (err) {
      console.error("❌ [SPORTS INTEL ERROR]:", err.message);
    }
  }
  
  module.exports = { sendToSportsIntel };
  