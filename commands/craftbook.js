// commands/craftbook.js
const { EmbedBuilder } = require('discord.js');

const recipes = [
  {
    title: '🌈 Rainbow Acid',
    req: '3x 🌀 Acid + 1x ✨ Purity Crystal',
    result: '1x 🌈 Rainbow Acid'
  },
  {
    title: '🔥 Ultra Meth',
    req: '2x 💎 Meth + 1x ✨ Purity Crystal',
    result: '1x 🔥 Ultra Meth'
  },
  {
    title: '💀 Void Heroin',
    req: '2x 🩸 Heroin + 1x ✨ Purity Crystal',
    result: '1x 💀 Void Heroin'
  },
  {
    title: '🍄 God Shrooms',
    req: '3x 🍄 Shrooms + 1x ✨ Purity Crystal',
    result: '1x 🍄 God Shrooms'
  },
  {
    title: '🌈 Rainbow Acid x10',
    req: '1x 🌈 Rainbow Acid + 1x 📦 Yield Booster x10',
    result: '10x 🌈 Rainbow Acid'
  },
  {
    title: '🔥 Ultra Meth x100',
    req: '1x 🔥 Ultra Meth + 1x 🏭 Yield Booster x100',
    result: '100x 🔥 Ultra Meth'
  },
  {
    title: '🩸 Heroin x50',
    req: '1x 🩸 Heroin + 1x 🚚 Yield Booster x50',
    result: '50x 🩸 Heroin'
  },
  {
    title: '🍄 Shrooms x100',
    req: '1x 🍄 Shrooms + 1x 🏭 Yield Booster x100',
    result: '100x 🍄 Shrooms'
  },
  {
    title: '🌿 Weed x10',
    req: '1x 🌿 Weed + 1x 📦 Yield Booster x10',
    result: '10x 🌿 Weed'
  },
  {
    title: '💎 Meth x50',
    req: '1x 💎 Meth + 1x 🚚 Yield Booster x50',
    result: '50x 💎 Meth'
  }
];

module.exports = {
  name: 'craftbook',
  description: 'View all known crafting recipes.',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('📖 Drug Craftbook')
      .setColor('#00ffaa')
      .setDescription('Combine items to create enhanced drugs or stacks. Use `!combine <id>` to craft.')
      .setFooter({ text: 'Use !combine rainbow_acid or any valid ID shown here.' });

    for (const r of recipes) {
      embed.addFields({
        name: r.title,
        value: `🧪 **Requires:** ${r.req}\n🎁 **Creates:** ${r.result}`,
        inline: false
      });
    }

    return message.reply({ embeds: [embed] });
  }
};
