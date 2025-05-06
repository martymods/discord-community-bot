const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const robberyCooldowns = new Map(); // userId -> timestamp

async function maybeTriggerRobbery(context) {
  const userId = context.author?.id || context.user?.id;
  const guildId = context.guild?.id;
  const channel = context.channel;

  if (!userId || !guildId || !channel) {
    console.warn("[ROBBERY] Missing context fields — skipping robbery check.");
    return;
  }

  // 1. Random chance (10%)
  if (Math.random() > 0.10) {
    console.log("[ROBBERY] Random chance failed — no robbery triggered.");
    return;
  }

  // 2. Cooldown check (5 mins per user)
  const now = Date.now();
  const last = robberyCooldowns.get(userId) || 0;
  if (now - last < 5 * 60 * 1000) {
    console.log("[ROBBERY] Cooldown active — skipping robbery for", userId);
    return;
  }
  robberyCooldowns.set(userId, now);

  // 3. Player must have at least $500
  const { getBalance } = require('../../economy/currency');
  const balance = await getBalance(userId, guildId);
  if (balance < 500) {
    console.log("[ROBBERY] Not enough balance for robbery:", balance);
    return;
  }

  // 4. Pick random robber image
  const robberImages = [
    'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/Robber_1.png',
    'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/Robber_2.png',
    'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/Robber_3.png',
    'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/Robber_4.png',
    'https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/Robber_5.png'
  ];
  const chosenImage = robberImages[Math.floor(Math.random() * robberImages.length)];

  const embed = new EmbedBuilder()
    .setTitle("💥 You've Been Ambushed!")
    .setDescription("A shady figure leaps from the shadows, demanding your money.")
    .setImage(chosenImage)
    .setColor('#aa0000')
    .setFooter({ text: "Fight back or attempt to flee!" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`npc_fight_${userId}`)
      .setLabel('Fight Back')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`npc_flee_${userId}`)
      .setLabel('Flee 🏃')
      .setStyle(ButtonStyle.Primary)
  );

  try {
    await channel.send({
      content: `<@${userId}>`,
      embeds: [embed],
      components: [row]
    });
    console.log(`[ROBBERY] Sent robbery event to ${userId}`);
  } catch (err) {
    console.error("[ROBBERY] Failed to send robbery message:", err.message);
  }
}

module.exports = {
  maybeTriggerRobbery
};
