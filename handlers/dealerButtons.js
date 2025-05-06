const { getBalance, addCash, removeCash } = require('../economy/currency');
const { drugs } = require('../utils/drugList');
const DealerProfile = require('../economy/dealerProfileModel');
const { generateDrugPrices } = require('../utils/generateDrugPrices');

const dealerLocks = new Map(); // userId -> lock

function getDrugName(id) {
  const drug = drugs.find(d => d.id.toLowerCase() === id.toLowerCase());
  return drug ? drug.name : id;
}

function getDrugEmoji(id) {
  const drug = drugs.find(d => d.id.toLowerCase() === id.toLowerCase());
  return drug ? drug.emoji : '❓';
}

async function safeReply(interaction, content) {
  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content, ephemeral: true });
    } else {
      await interaction.followUp({ content, ephemeral: true });
    }
  } catch (err) {
    console.warn('SafeReply failed:', err.message);
  }
}

async function updateDealerEmbed(interaction, profile, balance) {
  try {
    const updatedFields = [];

    if (!(profile.prices instanceof Map)) {
      profile.prices = new Map(Object.entries(profile.prices));
    }
    if (!(profile.inventory instanceof Map)) {
      profile.inventory = new Map(Object.entries(profile.inventory));
    }

    for (const [drugId, price] of profile.prices.entries()) {
      const name = getDrugName(drugId);
      const emoji = getDrugEmoji(drugId);
      const qty = profile.inventory.get(drugId) || 0;
      updatedFields.push({
        name: `${emoji} ${name} — $${price}`,
        value: `You own: ${qty}`,
        inline: true,
      });
    }

    const embed = {
      color: 0x2f3136,
      title: `💊 Street Market — ${interaction.user.username}`,
      description: `💰 ${balance} DreamworldPoints\n📦 ${profile.stashUsed}/${profile.stashCap} Stash`,
      fields: updatedFields.length > 0 ? updatedFields : [{ name: 'No items available.', value: 'Come back later!' }],
      footer: { text: `Prices update every 1 minute automatically` },
    };

    await interaction.message.edit({ embeds: [embed] });
  } catch (err) {
    console.warn('⚠️ Failed to update Street Market:', err.message);
  }
}

async function handleDealerButtons(interaction) {
  const { customId, user, guildId } = interaction;
  const parts = customId.split('_');
  const action = parts[0];
  const type = parts[1];
  const drugId = parts[2];
  const npcName = parts[3] ? parts[3].replace(/_/g, ' ') : 'Unknown';

  if (dealerLocks.has(user.id)) {
    return await safeReply(interaction, "⏳ Please wait before clicking again!");
  }
  dealerLocks.set(user.id, true);

  try {
    await interaction.deferUpdate().catch(() => {});

    let profile = await DealerProfile.findOne({ userId: user.id, guildId });
    if (!profile) {
      dealerLocks.delete(user.id);
      return await safeReply(interaction, "❌ Profile not found.");
    }

    if (!(profile.prices instanceof Map)) {
      profile.prices = new Map(Object.entries(profile.prices));
    }
    if (!(profile.inventory instanceof Map)) {
      profile.inventory = new Map(Object.entries(profile.inventory));
    }

    if (action === 'buy') {
      const price = profile.prices.get(drugId);
      if (!price) {
        dealerLocks.delete(user.id);
        return await safeReply(interaction, "❌ Item no longer available.");
      }

      const balance = await getBalance(user.id, guildId);
      const stashUsed = [...profile.inventory.values()].reduce((a, b) => a + b, 0);

      if (balance < price) {
        dealerLocks.delete(user.id);
        return await safeReply(interaction, "❌ Not enough DreamworldPoints.");
      }
      if (stashUsed >= profile.stashCap) {
        dealerLocks.delete(user.id);
        return await safeReply(interaction, "❌ Stash full!");
      }

      await removeCash(user.id, guildId, price);
      profile.inventory.set(drugId, (profile.inventory.get(drugId) || 0) + 1);
      profile.stashUsed = [...profile.inventory.values()].reduce((a, b) => a + b, 0);
      await profile.save();

      console.log('✅ [AFTER BUY] Profile inventory:', profile.inventory);

      const newBalance = await getBalance(user.id, guildId);
      await safeReply(interaction, `✅ Bought 1x ${getDrugEmoji(drugId)} ${getDrugName(drugId)} for $${price}!`);
      await updateDealerEmbed(interaction, profile, newBalance);

    } else if (action === 'sell') {
      const qty = profile.inventory.get(drugId) || 0;
      if (qty <= 0) {
        dealerLocks.delete(user.id);
        return await safeReply(interaction, `❌ You don't have any ${getDrugEmoji(drugId)} ${getDrugName(drugId)} to sell.`);
      }

      const price = profile.prices.get(drugId);
      if (!price) {
        dealerLocks.delete(user.id);
        return await safeReply(interaction, "❌ Item no longer available.");
      }

      await addCash(user.id, guildId, price);
      profile.inventory.set(drugId, qty - 1);
      profile.stashUsed = [...profile.inventory.values()].reduce((a, b) => a + b, 0);
      await profile.save();

      console.log('✅ [AFTER SELL] Profile inventory:', profile.inventory);

      const newBalance = await getBalance(user.id, guildId);
      await safeReply(interaction, `✅ Sold 1x ${getDrugEmoji(drugId)} ${getDrugName(drugId)} for $${price}!`);
      await updateDealerEmbed(interaction, profile, newBalance);

    } else if (action === 'npc') {
      const qty = profile.inventory.get(drugId) || 0;
      if (qty <= 0) {
        dealerLocks.delete(user.id);
        return await safeReply(interaction, `❌ You don't have any ${getDrugEmoji(drugId)} ${getDrugName(drugId)} to sell.`);
      }

      const basePrice = profile.prices.get(drugId) || 100;
      const npcOffer = Math.floor(basePrice * (Math.random() * 0.4 + 0.6));

      await addCash(user.id, guildId, npcOffer);
      profile.inventory.set(drugId, qty - 1);
      profile.stashUsed = [...profile.inventory.values()].reduce((a, b) => a + b, 0);
      await profile.save();

      console.log('✅ [AFTER NPC SELL] Profile inventory:', profile.inventory);

      const newBalance = await getBalance(user.id, guildId);
      await safeReply(interaction, `🤝 ${npcName} bought 1x ${getDrugEmoji(drugId)} ${getDrugName(drugId)} for $${npcOffer}!`);
      await updateDealerEmbed(interaction, profile, newBalance);

    } else {
      dealerLocks.delete(user.id);
      return await safeReply(interaction, "❌ Unknown action.");
    }

  } catch (err) {
    console.error('❌ Dealer Button Error:', err);
  } finally {
    dealerLocks.delete(user.id);
  }
}

module.exports = { handleDealerButtons };
