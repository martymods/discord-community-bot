// systems/crimeMissions.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addCash, removeCash, Currency } = require('../economy/currency');
const Levels = require('../economy/xpRewards');
const { getInventory, addItemToInventory } = require('../economy/inventory');
const items = require('../economy/items');
const { getAvailableCrimes, getTierData, getTierProgressBar, incrementCrimeProgress } = require('./crimeTierSystem');

// Modular Prefixes + Suffixes
const crimePrefixes = ['Silent', 'Back-alley', 'Messy', 'Covert', 'Brazen', 'Late-night', 'Crowded'];
const crimeSuffixes = ['on Main Street', 'during a parade', 'while cops ate', 'at the port', 'after curfew', 'under drone surveillance'];

function generateCrimeMission(type) {
  const prefix = crimePrefixes[Math.floor(Math.random() * crimePrefixes.length)];
  const suffix = crimeSuffixes[Math.floor(Math.random() * crimeSuffixes.length)];
  return `${prefix} ${type} ${suffix}`;
}

async function runCrime(channel, user, level, guildId, multiplier = 1) {
  const crimes = await getAvailableCrimes(user.id, guildId);
  const type = crimes[Math.floor(Math.random() * crimes.length)];
  const mission = generateCrimeMission(type);

  const baseReward = (100 + Math.floor(Math.random() * 100) + level * 20) * multiplier;
  const xpReward = (15 + Math.floor(Math.random() * 10) + level * 2) * multiplier;
  const failPenalty = Math.floor(baseReward / 2);
  const itemDropChance = 0.1 + level * 0.005;

  const embed = new EmbedBuilder()
    .setTitle(`🕵️ Crime Mission: ${mission}`)
    .setDescription(`Do you want to **risk it all** for a big reward or **lay low** and collect a safe payday?`)
    .setColor('#d4af37')
    .setFooter({ text: `Urban Crime Network | Level ${level}` })
    .setTimestamp();

  if (multiplier > 1) {
    embed.addFields({
      name: '📈 Gang Bonus',
      value: `Your gang network increased your payout by **${Math.round((multiplier - 1) * 100)}%**.`
    });
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`crime_risk_${user.id}`)
      .setLabel('💣 Risk It')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`crime_safe_${user.id}`)
      .setLabel('😎 Lay Low')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [buttons] });

  return {
    mission,
    baseReward,
    xpReward,
    failPenalty,
    itemDropChance,
  };
}

async function resolveCrimeOutcome(customId, interaction, userData) {
  const isRisk = customId.startsWith('crime_risk');
  const { mission, baseReward, xpReward, failPenalty, itemDropChance } = userData;

let successChance;
if (isRisk) {
  // 📈 Gang-based success boost
  const { getGangMembers } = require('../commands/gangs'); // Adjust if needed
  const Currency = require('../economy/currency').Currency;
  const profile = await Currency.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
  const gangKey = profile?.gang;
  let bonus = 0;

  if (gangKey) {
    const members = await getGangMembers(gangKey, interaction.guild.id);
    bonus = Math.min(members.length - 1, 49) * 0.008; // Max +0.392 (≈39.2%)
  }

  successChance = 0.6 + bonus; // Max 0.992
} else {
  successChance = 0.9;
}

  const success = Math.random() < successChance;
  const embed = new EmbedBuilder().setTitle(success ? '💸 Mission Success!' : '🚨 You Got Caught!').setTimestamp();

  if (success) {
    await addCash(interaction.user.id, interaction.guild.id, baseReward);
    await Levels.appendXp(interaction.user.id, interaction.guild.id, xpReward);

    embed.setDescription(`✅ You pulled off the **${mission}**!\nYou gained **$${Math.floor(baseReward)}** + **${Math.floor(xpReward)} XP**.`)
         .setColor('#00ff88');

         if (bonus > 0) {
  embed.addFields({
    name: '👥 Gang Support Bonus',
    value: `Your gang increased your success chance by **+${(bonus * 100).toFixed(1)}%**`
  });
}

    if (Math.random() < itemDropChance) {
      const drop = items[Math.floor(Math.random() * items.length)];
      await addItemToInventory(interaction.user.id, interaction.guild.id, drop.name, 1);
      embed.addFields({ name: '🎁 You Found Something!', value: `**${drop.name}** was added to your inventory.` });
    }

    // ✅ Tier Progression
    await incrementCrimeProgress(interaction.user.id, interaction.guild.id);
    const profile = await Currency.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
    const tierData = getTierData(profile.crimeTier + 1);
    if (tierData) {
      embed.addFields({
        name: '🧱 Tier Progress',
        value: getTierProgressBar(profile.crimesCompleted, tierData.crimesRequired)
      });
    }

  } else {
    await removeCash(interaction.user.id, interaction.guild.id, failPenalty);
    embed.setDescription(`❌ The **${mission}** went south.\nYou lost **$${failPenalty}** trying to escape.`)
         .setColor('#ff3333');
  }

  await interaction.update({ embeds: [embed], components: [] });
}

module.exports = {
  runCrime,
  resolveCrimeOutcome,
};
