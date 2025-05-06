// events/npc/npcMules.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addCash } = require('../../economy/currency');
const { adjustReputation, getReputationFooter } = require('./npcReputation');
const { Inventory } = require('../../economy/inventory');

const deliveryLoyalty = new Map(); // userId => successful deliveries

const muleDrugImages = {
  weed: 'mule_weed_0.png',
  meth: 'mule_meth_0.png',
  acid: 'mule_acid_0.png',
  heroin: 'mule_heroin_0.png',
  shrooms: 'mule_shrooms_0.png'
};

function getImageURL(file) {
  return `https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/${file}`;
}

function trySpawnMule(userId, guildId, inventory, channel) {
  console.log(`[MULE TRY] Checking inventory for mule spawn...`);
  const drugCounts = {};
  for (const item in inventory) {
    if (!drugCounts[item]) drugCounts[item] = 0;
    drugCounts[item] += inventory[item].qty;
  }

  const overstocked = Object.keys(drugCounts).filter(k => drugCounts[k] > 10);
  console.log(`[MULE TRY] Overstocked:`, overstocked);

  if (!overstocked.length || Math.random() > 0.3) {
    console.log(`[MULE TRY] No eligible drugs or random chance failed.`);
    return;
  }

  const targetDrug = overstocked[Math.floor(Math.random() * overstocked.length)];
  console.log(`[MULE TRY] Spawning mule offer for: ${targetDrug}`);

  const embed = new EmbedBuilder()
    .setTitle("🐫 Mule Offer")
    .setDescription(`A flight attendant offers to deliver your **${drugCounts[targetDrug]}x ${targetDrug}** stash for a 5% cut.\n\nDo you trust her?`)
    .setColor('#FFD580');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`mule_accept_${userId}_${targetDrug}`).setLabel('✈️ Accept Delivery').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`mule_decline_${userId}`).setLabel('❌ Keep It Safe').setStyle(ButtonStyle.Secondary)
  );

  channel.send({ embeds: [embed], components: [row] }).catch(err => console.error(`[MULE TRY] Failed to send mule offer:`, err));
}

async function spawnMule(client, user, guildId) {
  console.log(`[MULE SPAWN] Starting mule spawn for ${user.username}...`);
  try {
    const profile = await Inventory.findOne({ userId: user.id, guildId });
    if (!profile || !profile.inventory) {
      console.log(`[MULE SPAWN] No profile or inventory found.`);
      return;
    }

    const inv = profile.inventory instanceof Map
      ? Object.fromEntries(profile.inventory)
      : { ...profile.inventory };

    const drug = Object.keys(inv).find(d => inv[d] > 10 && muleDrugImages[d]);
    if (!drug) {
      console.log(`[MULE SPAWN] No overstocked muleable drug found.`);
      return;
    }

    const quantity = inv[drug];
    const cutPercent = 0.05;
    const baseValue = 100;
    const payout = Math.floor(quantity * baseValue * (1 - cutPercent));
    const cut = Math.floor(quantity * baseValue * cutPercent);
    const success = Math.random() < 0.9;
    const loyaltyKey = `${user.id}_mule_${drug}`;

    const embed = new EmbedBuilder()
      .setTitle(`🐫 Mule Offer — ${drug.toUpperCase()}`)
      .setDescription(`A shady mule is offering to deliver your **${quantity} ${drug}** for you.\n\n• 💰 You get **$${payout}**\n• 🤏 Mule takes a **5% cut**\n• 🚓 10% risk of getting caught`)
      .setThumbnail(getImageURL(muleDrugImages[drug]))
      .setColor('#cc8844')
      .setFooter({ text: getReputationFooter(user.id, 'Mule') })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mule_accept_${drug}`)
        .setLabel(`Send ${drug} via Mule`)
        .setStyle(ButtonStyle.Success)
    );

    const dm = await user.createDM();
    await dm.send({ embeds: [embed], components: [row] });
    console.log(`[MULE DM] Offer sent to ${user.username}`);

    const progressEmbed = new EmbedBuilder(embed);
    progressEmbed.setTitle("🚚 Delivery In Progress...").setDescription("Starting journey...");

    const progressMsg = await dm.send({ embeds: [progressEmbed] });
    let step = 0;
    const totalSteps = 12;

    const interval = setInterval(async () => {
      step++;
      const bar = "🟫".repeat(step) + "⬜".repeat(totalSteps - step);
      progressEmbed.setDescription(`Mule is smuggling your **${quantity} ${drug}**...\n\n\`${bar}\``);
      await progressMsg.edit({ embeds: [progressEmbed] });

      if (step === totalSteps) {
        clearInterval(interval);
        const busted = Math.random() < 0.1;
        const resultEmbed = new EmbedBuilder()
          .setTitle(busted ? "🚨 Mule Got Caught!" : "✅ Mule Delivered!")
          .setColor(busted ? "#aa0000" : "#00cc77")
          .setThumbnail(user.displayAvatarURL())
          .setImage(getImageURL(muleDrugImages[drug]))
          .setTimestamp();

        if (busted) {
          profile.inventory[drug] = 0;
          profile.markModified('inventory');
          await profile.save();

          resultEmbed.setDescription(`Your **${quantity} ${drug}** stash was **confiscated** at a checkpoint.`);
          await progressMsg.edit({ embeds: [resultEmbed] });

          const channel = client.channels.cache.get('1353730054693064819');
          if (channel) {
            const alertEmbed = new EmbedBuilder()
              .setTitle("🚨 Mule Busted at Checkpoint!")
              .setDescription(`<@${user.id}> just lost **${quantity} ${drug}** trying to move it through back channels.`)
              .setThumbnail(user.displayAvatarURL())
              .setImage(getImageURL(muleDrugImages[drug]))
              .setColor("#cc0000")
              .setFooter({ text: "All eyes are watching..." })
              .setTimestamp();
            await channel.send({ embeds: [alertEmbed] });
            console.log(`[MULE ALERT] Busted alert sent.`);
          } else {
            console.warn(`[MULE ALERT] Failed to find broadcast channel.`);
          }
        } else {
          profile.inventory[drug] = 0;
          profile.stashUsed -= quantity;
          profile.markModified('inventory');
          await profile.save();
          await addCash(user.id, guildId, payout);

          resultEmbed.setDescription(`✅ Delivery complete!\nYou earned **$${payout}** (after 5% cut) for ${quantity} ${drug}.`);
          await progressMsg.edit({ embeds: [resultEmbed] });

          const current = deliveryLoyalty.get(user.id) || 0;
          deliveryLoyalty.set(user.id, current + 1);
        }
      }
    }, 10000);
  } catch (e) {
    console.error(`[MULE SPAWN ERROR] Failed to spawn mule for ${user.username}:`, e);
  }
}

module.exports = {
  spawnMule,
  trySpawnMule,
  deliveryLoyalty
};
