// 📁 /commands/mlbpredict.js
client.commands.set('mlbpredict', {
  async execute(message) {
    const allowedChannel = '1353730054693064819';
    if (message.channel.id !== allowedChannel) {
      return message.reply('⚠️ This command only works in the #sports-intel channel.');
    }

    console.log("✅ Running command: mlbpredict");
    console.log("[MLBPREDICT] Triggered by", message.author.username, `(${message.author.id})`);

    try {
      const { buildMLBTeamStats } = require('./economy/buildMLBTeamStats');
      const { getTodayMLBGames } = require('./economy/mlbGames');
      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

      const games = await getTodayMLBGames();
      console.log(`[MLBPREDICT] Games fetched: ${games.length}`);
      if (!games.length) return message.reply("📭 No MLB games to predict today.");

      const stats = await buildMLBTeamStats();
      console.log("[MLBPREDICT] Team stats keys:", Object.keys(stats));

      for (const game of games) {
        const { home, visitor } = game;
        const homeStats = stats[home];
        const awayStats = stats[visitor];

        console.log(`[MLBPREDICT] Analyzing game: ${visitor} @ ${home}`);

        if (!homeStats || !awayStats) {
          console.warn(`[MLBPREDICT] Missing stats for ${visitor} @ ${home}`);
          await message.channel.send(`⚠️ Missing data for **${visitor} @ ${home}**.`);
          continue;
        }

        const homeScore = homeStats.powerScore;
        const awayScore = awayStats.powerScore;
        const predicted = homeScore > awayScore ? home : visitor;
        const confidence = Math.abs(homeScore - awayScore).toFixed(2);

        const prob = (1 / (1 + Math.pow(10, (awayScore - homeScore) / 10))) * 100;
        const predictedOdds = predicted === home ? prob : 100 - prob;
        const decimalOdds = (100 / predictedOdds).toFixed(2);

        const embed = new EmbedBuilder()
          .setTitle(`⚾ MLB Prediction: ${visitor} @ ${home}`)
          .setDescription(`**Predicted Winner:** 🏆 **${predicted}**\n**Confidence Score:** ${confidence}\n**Simulated Odds:** ${decimalOdds}x return`)
          .addFields(
            {
              name: `${home} Stats`,
              value: `Win%: ${(homeStats.winPct * 100).toFixed(1)}%\nRuns/Game: ${homeStats.runsPerGame.toFixed(1)}\nAllowed: ${homeStats.runsAllowed.toFixed(1)}\nERA: ${homeStats.teamERA}\nHR: ${homeStats.homeRuns}\nSO: ${homeStats.strikeouts}\nPower: ${homeScore.toFixed(2)}`,
              inline: true
            },
            {
              name: `${visitor} Stats`,
              value: `Win%: ${(awayStats.winPct * 100).toFixed(1)}%\nRuns/Game: ${awayStats.runsPerGame.toFixed(1)}\nAllowed: ${awayStats.runsAllowed.toFixed(1)}\nERA: ${awayStats.teamERA}\nHR: ${awayStats.homeRuns}\nSO: ${awayStats.strikeouts}\nPower: ${awayScore.toFixed(2)}`,
              inline: true
            }
          )
          .setFooter({ text: 'Dreamworld Sports Analytics - MLB' })
          .setColor(predicted === home ? '#f39c12' : '#2980b9')
          .setTimestamp();

        await message.channel.send({ embeds: [embed] });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`mlbbet_${predicted}_${home}_${visitor}`)
            .setLabel(`Bet on ${predicted}`)
            .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ content: `💵 Want to bet on **${predicted}**?`, components: [row] });
      }
    } catch (err) {
      console.error('❌ [MLBPREDICT ERROR]:', err);
      return message.reply('⚠️ Something went wrong predicting MLB games.');
    }
  }
});
