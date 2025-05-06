const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Currency } = require('../economy/currency');

// 💥 Your full gang list (copied from index.js or source of truth)
const gangs = {
  voodoo: { name: "On Point Gang", icon: "👓", color: "#aa00ff", bonus: "Robbery Resistance" },
  blitz: { name: "Blitz Mode", icon: "🚬", color: "#ff2200", bonus: "Extra XP/Cash from Challenges" },
  killers: { name: "Red Box Service", icon: "⚰🩸", color: "#cc0000", bonus: "More Real PvP Damage" },
  bribe: { name: "Blue Fence", icon: "🙅‍♂️💵", color: "#55cc55", bonus: "+10% item profit" },
  whisper: { name: "Digital Wipe", icon: "👨‍💻🧢", color: "#339999", bonus: "Reduced Heat Gain" },
  challenge: { name: "Golden Chicken", icon: "🏆", color: "#ffaa00", bonus: "Duel Bonus Payouts" },
  bounty: { name: "Catching Rank", icon: "💣", color: "#ff6600", bonus: "Bonus Bounty Rewards" },
  heist: { name: "Lost and Found", icon: "👅", color: "#888888", bonus: "Steal Bonus Payouts" },
  syndicate: { name: "Diamond House", icon: "💎🏠", color: "#00aa99", bonus: "Item Sale Bonus" }
};

// 🔧 Converts gang object into array for pagination
const gangArray = Object.entries(gangs); // [ [ 'voodoo', { ... } ], ... ]

function buildGangEmbed(gangId, gang, members, index) {
  const memberList = members.length
    ? members.map(m => `**${m.username || 'Unknown'}**`).join('\n')
    : '*No members yet*';

  return new EmbedBuilder()
    .setTitle(`${gang.icon} ${gang.name}`)
    .setDescription(memberList)
    .setColor(gang.color || '#888888')
    .setFooter({ text: `Gang ${index + 1} of ${gangArray.length}` });
}

async function getGangMembers(gangId, guildId) {
  const members = await Currency.find({ guildId, gang: gangId });
  return members.map(m => ({ username: m.username || 'Unknown' }));
}

module.exports = {
  name: 'gangs',
  async execute(message) {
    const index = 0;
    const [gangId, gang] = gangArray[index];
    const members = await getGangMembers(gangId, message.guild.id);
    const embed = buildGangEmbed(gangId, gang, members, index);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`gang_prev_${index}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`gang_next_${index}`).setLabel('➡️').setStyle(ButtonStyle.Primary)
    );

    await message.reply({ embeds: [embed], components: [row] });
  },
  gangs,
  getGangMembers,
  buildGangEmbed
};

