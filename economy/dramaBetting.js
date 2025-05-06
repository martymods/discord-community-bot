const dramaLines = [
    (user) => `💸 <@${user}> just lost it all trying to flex.`,
    (user) => `🤑 <@${user}> flipped their DreamTokens like a real hustler.`,
    (user) => `😬 <@${user}> learned why betting isn't for the faint hearted.`,
  ];
  
  module.exports = {
    sendDrama(client, userId) {
      const guild = client.guilds.cache.first();
      const channel = guild.systemChannel;
      const line = dramaLines[Math.floor(Math.random() * dramaLines.length)](userId);
      channel.send(line);
    }
  };
  