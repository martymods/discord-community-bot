const DramaLines = [
    // Rivalry Lies
    (client, guild) => {
      const members = guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
      if (members.length < 2) return;
  
      const a = members[Math.floor(Math.random() * members.length)];
      const b = members[Math.floor(Math.random() * members.length)];
      if (a.id === b.id) return;
  
      return `👀 Rumor has it <@${a.id}> just passed <@${b.id}> on the leaderboard... awkward.`;
    },
  
    // Flex Lies
    (client, guild) => `💎 Someone just pulled a Legendary Item... but they’re keeping it quiet.`,
  
    // Betrayal Vibes
    (client, guild) => {
      const members = guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
      const a = members[Math.floor(Math.random() * members.length)];
      return `🤐 I heard <@${a.id}> has been making deals in DMs...`
    },
  
    // Trash Talk
    (client, guild) => {
      const members = guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
      const a = members[Math.floor(Math.random() * members.length)];
      return `😬 <@${a.id}> loses more flips than anyone else here lmao.`
    },
  
    // Drama Starter
    (client, guild) => {
      const randomNum = Math.floor(Math.random() * 50) + 1;
      return `⚠️ There are only ${randomNum} LEGENDARY ITEMS left this month... or are there?`
    },
  
  ];
  
  module.exports = {
    triggerDrama: async (client) => {
      const guild = client.guilds.cache.first();
      const channel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0); // First text channel
  
      if (!guild || !channel) return;
  
      const lineFunc = DramaLines[Math.floor(Math.random() * DramaLines.length)];
      const line = lineFunc(client, guild);
      if (!line) return;
  
      await channel.send(line);
    }
  };
  