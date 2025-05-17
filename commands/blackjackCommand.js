// blackjackCommand.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getBalance, addCash, removeCash } = require("../economy/currency");
const Levels = require("../economy/xpRewards");

const activeTables = new Map();
const cardDeck = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"];
const suits = ["♣️", "♦️", "♥️", "♠️"];

function createDeck() {
  const deck = [];
  for (const val of cardDeck) {
    for (const suit of suits) {
      deck.push({ value: val, suit });
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

function renderHand(cards) {
  return cards.map(c => `\`${c.value.toUpperCase()}\`${c.suit}`).join(" ");
}

function generateTableEmbed(table, userId) {
  const playerHand = table.hands[userId] || [];
  const handValue = calculateHandValue(playerHand);

  const embed = new EmbedBuilder()
    .setTitle(`🃏 Blackjack Table (${table.players.length}/8)`)
    .setDescription(`**Your Hand** (${handValue}):\n${renderHand(playerHand)}`)
    .setColor("#ffaa00");

  if (table.dealerRevealed) {
    const dealerVal = calculateHandValue(table.dealerHand);
    embed.addFields({
      name: "💼 Dealer Hand",
      value: `${renderHand(table.dealerHand)} (${dealerVal})`
    });
  }

  return embed;
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
    console.log(`[BLACKJACK] ${userId} joined with $${betAmount}`);

    let table = [...activeTables.values()].find(t => t.players.length < 8);
    if (!table) {
      const tableId = `table_${Date.now()}`;
      table = {
        id: tableId,
        deck: createDeck(),
        players: [],
        hands: {},
        dealerHand: [],
        dealerRevealed: false,
        donePlayers: new Set()
      };
      activeTables.set(tableId, table);
    }

    table.players.push(userId);
    table.hands[userId] = [table.deck.pop(), table.deck.pop()];

    const embed = generateTableEmbed(table, userId);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${table.id}_${userId}`).setLabel("🂠 Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_hold_${table.id}_${userId}`).setLabel("✋ Hold").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`bj_leave_${table.id}_${userId}`).setLabel("🚪 Leave").setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({ content: `<@${userId}>`, embeds: [embed], components: [row] });
  },

  async handleButton(interaction) {
    const userId = interaction.user.id;
    const [_, action, tableId, playerId] = interaction.customId.split("_");

    if (userId !== playerId) {
      return interaction.reply({ content: "❌ Not your game.", ephemeral: true });
    }

    const table = activeTables.get(tableId);
    if (!table) {
      return interaction.reply({ content: "❌ Table not found.", ephemeral: true });
    }

    const hand = table.hands[userId];
    if (!hand) {
      return interaction.reply({ content: "❌ You don't have a hand at this table.", ephemeral: true });
    }

    if (action === "hit") {
      const newCard = table.deck.pop();
      hand.push(newCard);
      console.log(`[BJ] ${userId} HIT:`, newCard);
      if (calculateHandValue(hand) > 21) {
        table.donePlayers.add(userId);
        await interaction.reply({ content: `💥 You busted!`, ephemeral: true });
      }
    }

    if (action === "hold") {
      table.donePlayers.add(userId);
      await interaction.reply({ content: `🧍 You hold.`, ephemeral: true });
    }

    if (action === "leave") {
      table.players = table.players.filter(id => id !== userId);
      table.donePlayers.add(userId);
      return interaction.reply({ content: "🚪 You left the table.", ephemeral: true });
    }

    if (table.donePlayers.size === table.players.length) {
      while (calculateHandValue(table.dealerHand) < 17) {
        table.dealerHand.push(table.deck.pop());
      }
      table.dealerRevealed = true;
    }

    const embed = generateTableEmbed(table, userId);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${table.id}_${userId}`).setLabel("🂠 Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_hold_${table.id}_${userId}`).setLabel("✋ Hold").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`bj_leave_${table.id}_${userId}`).setLabel("🚪 Leave").setStyle(ButtonStyle.Danger)
    );

    // Evaluate if game ended for this player
    if (table.dealerRevealed && table.donePlayers.has(userId)) {
      const dealerVal = calculateHandValue(table.dealerHand);
      const playerVal = calculateHandValue(hand);

      let result = "lose";
      if (playerVal > 21) result = "lose";
      else if (dealerVal > 21 || playerVal > dealerVal) result = "win";
      else if (playerVal === dealerVal) result = "draw";

      let payout = 0;
      let msg = `🧾 Dealer: ${dealerVal} | You: ${playerVal} → `;
      if (result === "win") {
        payout = playerVal === 21 && hand.length === 2 ? 300 : 200;
        msg += `🎉 You win **$${payout}**`;
        await addCash(userId, interaction.guildId, payout);
        await Levels.appendXp(userId, interaction.guildId, 25);
        if (playerVal === 21 && hand.length === 2) {
          interaction.channel.send(`🎥 <@${userId}> beat the dealer with BLACKJACK! 💎`).catch(() => {});
        }
      } else if (result === "draw") {
        payout = 100;
        msg += "🤝 Push. You get your bet back.";
        await addCash(userId, interaction.guildId, payout);
        await Levels.appendXp(userId, interaction.guildId, 5);
      } else {
        msg += "💀 You lose your bet.";
      }

      embed.addFields({ name: "🎯 Result", value: msg });
    }

    return interaction.message.edit({ embeds: [embed], components: [row] }).catch(() => {});
  }
};
