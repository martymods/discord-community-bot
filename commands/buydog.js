const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getBalance, removeCash } = require('../economy/currency');
const { setDog } = require('../events/npc/defense/dogSystem');

const DOGS = {
  pitbull: { name: 'Pitbull', cost: 10000, hp: 100, level: 1, mood: 'Happy', cooldown: 0 },
  shepherd: { name: 'Shepherd', cost: 15000, hp: 100, level: 1, mood: 'Happy', cooldown: 0 },
  pomeranian: { name: 'Pomeranian', cost: 25000, hp: 100, level: 1, mood: 'Happy', cooldown: 0 }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buydog')
    .setDescription('Adopt a loyal guard dog to protect your stash!'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🐶 Adopt a Guard Dog')
      .setDescription(`Pick a breed below to guard your stash!\nEach dog has unique traits. Only 1 dog defends at a time.`)
      .setColor('#ffaa00');

    const row = new ActionRowBuilder().addComponents(
      Object.entries(DOGS).map(([id, data]) =>
        new ButtonBuilder()
          .setCustomId(`buydog_${id}`)
          .setLabel(`${data.name} — $${data.cost}`)
          .setStyle(ButtonStyle.Primary)
      )
    );

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
