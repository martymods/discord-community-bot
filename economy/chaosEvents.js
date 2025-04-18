// chaosEvents.js
const { EmbedBuilder } = require('discord.js');

const chaosStates = [
  {
    id: 'blackmarket',
    name: '💣 Black Market Surge',
    description: 'All crime payouts are doubled for 10 minutes.',
    duration: 10 * 60 * 1000,
    effect: (client) => client.chaosModifiers.crimeMultiplier = 2
  },
  {
    id: 'crackdown',
    name: '🚔 Police Crackdown',
    description: 'All failed crimes will lose double.',
    duration: 10 * 60 * 1000,
    effect: (client) => client.chaosModifiers.failPenalty = 2
  },
  {
    id: 'loosepurse',
    name: '💰 Loose Purse Hour',
    description: 'Everyone is vulnerable — even hiding users.',
    duration: 10 * 60 * 1000,
    effect: (client) => client.chaosModifiers.noHideouts = true
  }
];

let activeEvent = null;
let chaosTimer = null;

function startRandomChaos(client, channel) {
  if (activeEvent) return; // already active

  const chaos = chaosStates[Math.floor(Math.random() * chaosStates.length)];
  activeEvent = chaos;
  client.chaosModifiers = client.chaosModifiers || {};
  chaos.effect(client);

  const embed = new EmbedBuilder()
    .setTitle(chaos.name)
    .setDescription(chaos.description)
    .setColor('#ff0066')
    .setFooter({ text: `Ends in 10 minutes...` })
    .setTimestamp();

  channel.send({ embeds: [embed] });

  chaosTimer = setTimeout(() => {
    activeEvent = null;
    client.chaosModifiers = {}; // reset
    channel.send('🧯 Chaos Event has ended. The streets feel calmer... for now.');
  }, chaos.duration);
}

module.exports = { startRandomChaos };
