// components/statsButtonBuilder.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = function buildStatButtons(userId, remainingPoints) {
  const buttons = [
    { id: 'strength', label: '💪 Strength' },
    { id: 'agility', label: '🦶 Agility' },
    { id: 'grit', label: '💥 Grit' },
    { id: 'luck', label: '🍀 Luck' },
    { id: 'intellect', label: '🧠 Intellect' },
    { id: 'vitality', label: '❤️ Vitality' }
  ];

  const rows = [];
  for (let i = 0; i < buttons.length; i += 3) {
    const row = new ActionRowBuilder();
    for (let j = i; j < i + 3 && j < buttons.length; j++) {
      const btn = buttons[j];
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`stat_${btn.id}_${userId}`)
          .setLabel(`+ ${btn.label}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(remainingPoints <= 0)
      );
    }
    rows.push(row);
  }

  return rows;
};
