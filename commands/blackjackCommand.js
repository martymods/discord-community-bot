const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getBalance, addCash, removeCash } = require("../economy/currency");
const Levels = require("../economy/xpRewards");

const activeTables = new Map();
const cardDeck = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"];
const suits = ["c", "d", "h", "s"];
const blackjackBonus = 2.5;

function createDeck() {
  const deck = [];
  for (const val of cardDeck) {
    for (const suit of suits) {
      const isRed = suit === "d" || suit === "h";
      deck.push({
        name: `${val}_${suit}_${isRed ? "r" : "b"}`,
        value: val,
        suit
      });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function calculateHandValue(cards) {
  let value = 0;
  let aces = 0;
  for (const card of cards) {
    if (["jack", "queen", "king"].includes(card.value)) value += 10;
    else if (card.value === "ace") {
      aces++;
      value += 11;
    } else {
      value += parseInt(card.value);
    }
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function renderCardImages(cards) {
  return cards.map((c, i) => `**Card ${i + 1}:**\nhttps://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/${c.name}.png`).join("\n\n");
}

async function handleButton(interaction) {
  const { customId, user, guildId } = interaction;
  const [action, tableId, playerId] = customId.split("_");

  if (user.id !== playerId) return interaction.reply({ content: "❌ Not your game.", ephemeral: true });

  const table = activeTables.get(tableId);
  if (!table) return interaction.reply({ content: "❌ Table not found.", ephemeral: true });

  const playerHand = table.hands[playerId];

  if (action === "hit") {
    playerHand.push(table.deck.pop());
    const value = calculateHandValue(playerHand);

    if (value > 21) {
      table.finished = true;
      return await finishGame(interaction, table, user.id, guildId, "bust");
    }
  }

  if (action === "hold") {
    table.finished = true;
    return await finishGame(interaction, table, user.id, guildId, "hold");
  }

  if (action === "leave") {
    activeTables.delete(tableId);
    return interaction.reply({ content: "🚪 You left the table.", ephemeral: true });
  }

  // Send updated hand if not finished
  const handValue = calculateHandValue(playerHand);
  const embed = new EmbedBuilder()
    .setTitle(`🃏 Blackjack Table (${table.players.length}/8)`)
    .setDescription(`Value: **${handValue}**\n\n${renderCardImages(playerHand)}`)
    .setColor("#ffaa00");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`hit_${table.id}_${user.id}`).setLabel("🂠 Hit").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`hold_${table.id}_${user.id}`).setLabel("✋ Hold").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`leave_${table.id}_${user.id}`).setLabel("🚪 Leave").setStyle(ButtonStyle.Danger)
  );

  return interaction.update({ embeds: [embed], components: [row] });
}

async function finishGame(interaction, table, userId, guildId, reason) {
  const playerHand = table.hands[userId];
  const dealer = table.dealerHand || [table.deck.pop(), table.deck.pop()];

  while (calculateHandValue(dealer) < 17) {
    dealer.push(table.deck.pop());
  }

  const playerVal = calculateHandValue(playerHand);
  const dealerVal = calculateHandValue(dealer);
  const betAmount = 100;

  let outcome = "lose";
  let bonus = 0;

  if (playerVal > 21) outcome = "bust";
  else if (playerVal === 21 && playerHand.length === 2) {
    outcome = "blackjack";
    bonus = Math.floor(betAmount * blackjackBonus);
  } else if (dealerVal > 21 || playerVal > dealerVal) outcome = "win";
  else if (dealerVal === playerVal) outcome = "draw";

  let resultText = "";
  if (outcome === "blackjack") {
    resultText = `💎 BLACKJACK! You win **$${bonus}**`;
    await addCash(userId, guildId, bonus);
    interaction.channel.send(`🎥 **${interaction.user.username} hit BLACKJACK (21 with 2 cards) against the dealer!**`);
  } else if (outcome === "win") {
    resultText = `✅ You beat the dealer! You win **$${betAmount * 2}**`;
    await addCash(userId, guildId, betAmount * 2);
    if (playerVal === 21) {
      interaction.channel.send(`🎥 **${interaction.user.username} beat the dealer with 21!**`);
    }
  } else if (outcome === "draw") {
    resultText = `➖ It's a draw. Your $${betAmount} was returned.`;
    await addCash(userId, guildId, betAmount);
  } else {
    resultText = "❌ You lost this round.";
  }

  await Levels.appendXp(userId, guildId, 20);

  const finalEmbed = new EmbedBuilder()
    .setTitle("🎲 Final Result")
    .setDescription(
      `**Your Hand**: ${playerVal} (${playerHand.map(c => c.name).join(", ")})\n` +
      `**Dealer**: ${dealerVal} (${dealer.map(c => c.name).join(", ")})\n\n` +
      resultText
    )
    .setColor(outcome === "blackjack" || outcome === "win" ? "#00ff88" : "#ff3333");

  activeTables.delete(table.id);
  return interaction.update({ embeds: [finalEmbed], components: [] });
}

module.exports = {
  name: "blackjack",
  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const betAmount = 100;
    const balance = await getBalance(userId, guildId);

    if (balance < betAmount) {
      return interaction.reply({ content: "❌ Not enough funds to join blackjack table.", ephemeral: true });
    }

    await removeCash(userId, guildId, betAmount);

    let table = [...activeTables.values()].find(t => t.players.length < 8);
    if (!table) {
      const tableId = `table_${Date.now()}`;
      table = {
        id: tableId,
        deck: createDeck(),
        players: [],
        hands: {},
        dealerHand: [],
        status: "waiting"
      };
      activeTables.set(tableId, table);
    }

    table.players.push(userId);
    table.hands[userId] = [table.deck.pop(), table.deck.pop()];
    table.dealerHand = table.dealerHand.length ? table.dealerHand : [table.deck.pop(), table.deck.pop()];

    const hand = table.hands[userId];
    const handValue = calculateHandValue(hand);

    const embed = new EmbedBuilder()
      .setTitle(`🃏 Blackjack Table (${table.players.length}/8)`)
      .setDescription(`Value: **${handValue}**\n\n${renderCardImages(hand)}`)
      .setColor("#ffaa00");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`hit_${table.id}_${userId}`).setLabel("🂠 Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`hold_${table.id}_${userId}`).setLabel("✋ Hold").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`leave_${table.id}_${userId}`).setLabel("🚪 Leave").setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({ content: `<@${userId}>`, embeds: [embed], components: [row] });
  },
  handleButton
};
