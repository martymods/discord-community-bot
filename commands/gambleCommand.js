const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const { getBalance, addCash, removeCash } = require("../economy/currency");
const Levels = require("../economy/xpRewards");

const xpPerTier = {
  10: 2,
  100: 10,
  1000: 25,
  10000: 75,
  100000: 250,
};

const cooldowns = new Map();
const winStreaks = new Map();
const jackpotOdds = 0.02;
const memoryEcho = new Map();
const lastWinMessages = new Map();

module.exports = {
  name: "gamble",
  async execute(message) {
    const userId = message.author.id;

    const gameEmbed = new EmbedBuilder()
      .setTitle("🎰 Gamble Center")
      .setDescription("Choose a game of chance to play:")
      .setColor("#ffaa00");

    const selector = new StringSelectMenuBuilder()
      .setCustomId(`gamble_select_${userId}`)
      .setPlaceholder("Select a game to play...")
      .addOptions([
        {
          label: "Scratch Card 🎟️",
          description: "1 in 5 chance to win 5x your money",
          value: "scratch"
        },
        {
          label: "Street Dice 🎲",
          description: "50/50 coin flip style luck",
          value: "dice"
        },
        {
          label: "Blackjack 🃏",
          description: "Play against the house with up to 7 others",
          value: "blackjack"
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selector);

    console.log("[GAMBLE COMMAND] Sending selector menu for user:", userId);

    await message.channel.send({
      content: `<@${userId}>`,
      embeds: [gameEmbed],
      components: [row]
    });
  },

  async handleRematch(interaction, game, tier, userId) {
    await interaction.deferUpdate();
    console.log(`[REMATCH] Triggered for ${userId}, game=${game}, tier=${tier}`);

    const lastClick = cooldowns.get(userId);
    if (lastClick && Date.now() - lastClick < 5000) {
      return interaction.followUp({ content: "🕒 Slow down a bit...", ephemeral: true });
    }
    cooldowns.set(userId, Date.now());

    const balance = await getBalance(userId, interaction.guildId);
    if (balance < tier) {
      return interaction.followUp({ content: `💸 Not enough money to rematch $${tier}`, ephemeral: true });
    }

    await removeCash(userId, interaction.guildId, tier);

    const suspense = await interaction.channel.send(`🔁 Rematch rolling for <@${userId}>...`);
    await new Promise(r => setTimeout(r, 1500));

    // Random Event: Double Trouble
    const isDoubleTrouble = Math.random() < 0.01;

    const won = Math.random() < (game === "scratch" ? 0.2 : 0.5);
    const hitJackpot = Math.random() < jackpotOdds;

    const winnings = won
      ? tier * (game === "scratch" ? 5 : 2) * (hitJackpot ? 3 : 1)
      : 0;

    if (won) await addCash(userId, interaction.guildId, winnings);

    const streak = winStreaks.get(userId) || 0;
    const newStreak = won ? streak + 1 : 0;
    winStreaks.set(userId, newStreak);

    let bonusXP = xpPerTier[tier] + (newStreak >= 3 ? 10 : 0);
    if (hitJackpot) bonusXP += 25;
    if (isDoubleTrouble) bonusXP *= 2;

    try {
      await Levels.appendXp(userId, interaction.guildId, bonusXP);
    } catch (err) {
      console.warn("⚠️ Rematch XP error:", err.message);
    }

    // 🎞️ Fakeout (simulate fake result before showing real)
    const fakeCards = ["💀 You Lost", "🎉 You Won!", "🤡 No Refunds", "💸 Critical L"];
    const fakeEmbed = new EmbedBuilder()
      .setTitle("🎲 Rolling...")
      .setDescription(`**${fakeCards[Math.floor(Math.random() * fakeCards.length)]}**`)
      .setColor("#cccccc");
    await suspense.edit({ embeds: [fakeEmbed], components: [] });

    await new Promise(r => setTimeout(r, 1000));

    // 🧠 Memory Echo
    const echo = memoryEcho.get(userId);
    const memoryLine = echo ? `🧠 Last time you picked $${echo}... it was wild.` : "";
    memoryEcho.set(userId, tier);

    // 💬 Crowd Hype
    if (newStreak >= 3 && !lastWinMessages.has(userId)) {
      const channel = interaction.guild.channels.cache.find(c => c.name === "gamble-chat" || c.name === "general");
      if (channel) {
        channel.send(`🔥 <@${userId}> just hit a ${newStreak}-win streak on ${game.toUpperCase()}!`);
      }
      lastWinMessages.set(userId, Date.now());
    }

    const barPct = Math.floor(jackpotOdds * 100);
    const bar = "█".repeat(barPct / 10) + "░".repeat(10 - barPct / 10);

    const embed = new EmbedBuilder()
      .setTitle(hitJackpot ? "💎 JACKPOT!" : won ? "🎉 You Won!" : "💀 You Lost")
      .setDescription(
        `${won ? `You won **$${winnings}**` : "Better luck next time!"}
${hitJackpot ? "💰 Jackpot Multiplier Applied!" : ""}
${isDoubleTrouble ? "🃏 **Double Trouble! XP DOUBLED**" : ""}
${memoryLine}`
      )
      .setFooter({ text: `+${bonusXP} XP | 🔥 Streak: ${newStreak}` })
      .setColor(won ? "#00ff88" : "#ff3333")
      .addFields({ name: "🎰 Jackpot Meter", value: `${bar} ${Math.floor(jackpotOdds * 100)}%`, inline: true });

    const rematchRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rematch_${game}_${tier}_${userId}`)
        .setLabel("🔁 Rematch Again")
        .setStyle(ButtonStyle.Secondary)
    );

    return suspense.edit({
      content: `<@${userId}>`,
      embeds: [embed],
      components: [rematchRow]
    });
  }
};
