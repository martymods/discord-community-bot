// 📁 /commands/mlbpredict.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { buildMLBTeamStats } = require('../economy/buildMLBTeamStats');
const { getTodayMLBGames } = require('../economy/mlbGames');

module.exports = {
  async execute(message) {
    const allowedChannel = '1353730054693064819';
    if (message.channel.id !== allowedChannel) {
      return message.reply('⚠️ This command only works in the #sports-intel channel.');
    }

    console.log("✅ Running command: mlbpredict");

    try {
      const games = await getTodayMLBGames();
      if (!games.length) return message.reply("📭 No MLB games to predict today.");

      const stats = await buildMLBTeamStats();
      console.log("[MLBPREDICT] Team stats keys:", Object.keys(stats));

      for (const game of games) {
        const { home, visitor } = game;
        const homeStats = stats[home];
        const awayStats = stats[visitor];

        if (!homeStats || !awayStats) {
          console.warn(`[MLBPREDICT] Missing stats for ${visitor} @ ${home}`);
          await message.channel.send(`⚠️ Missing data for **${visitor} @ ${home}**.`);
          continue;
        }

        const homeScore = homeStats.powerScore;
        const awayScore = awayStats.powerScore;
        const predicted = homeScore > awayScore ? home : visitor;
        const confidence = Math.abs(homeScore - awayScore).toFixed(2);

        // 🧮 Simulate betting odds
        const prob = (1 / (1 + Math.pow(10, (awayScore - homeScore) / 10))) * 100;
        const predictedOdds = predicted === home ? prob : 100 - prob;
        const decimalOdds = (100 / predictedOdds).toFixed(2);

        const embed = new EmbedBuilder()
          .setTitle(`⚾ MLB Prediction: ${awayStats.fullName} @ ${homeStats.fullName}`)
          .setThumbnail(predicted === home ? homeStats.logo : awayStats.logo)
          .setDescription(`**Predicted Winner:** 🏆 **${predicted}**
**Confidence Score:** ${confidence}
**Simulated Odds:** ${decimalOdds}x return`)
          .addFields(
            {
              name: `${homeStats.fullName} Stats`,
              value: `AVG: ${homeStats.avg}\nOBP: ${homeStats.obp}\nSLG: ${homeStats.slg}\nRuns/Game: ${homeStats.runsPerGame.toFixed(1)}\nPower: ${homeScore.toFixed(2)}`,
              inline: true
            },
            {
              name: `${awayStats.fullName} Stats`,
              value: `AVG: ${awayStats.avg}\nOBP: ${awayStats.obp}\nSLG: ${awayStats.slg}\nRuns/Game: ${awayStats.runsPerGame.toFixed(1)}\nPower: ${awayScore.toFixed(2)}`,
              inline: true
            }
          )
          .setFooter({ text: 'Dreamworld Sports Analytics - MLB' })
          .setColor(predicted === home ? '#008000' : '#0000cd')
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
};
