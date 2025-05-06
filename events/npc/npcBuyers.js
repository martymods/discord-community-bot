// npcBuyers.js — Phase 8: Mood Swings + Greed Scaling

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkSnitchTrigger, selectSnitchImage, getSnitchQuantity } = require('./npcSnitches');
const { spawnMule } = require('./npcMules');




const npcNames = [
  'Sticky Daryl', 'Metro Luther', 'Ghost Ray', 'Lil Drip', 'Twitchy Steve',
  'Fake Jerry', 'Nails Marv', 'Fishscale Finn', 'Hazmat Leo', 'Yung Crumbs',
  'JuJu Flex', 'Wiretap Wes', 'OffGrid Manny', 'Dicey Dan', 'Muffin Face',
  'Southside Ali', 'Quick Kash', 'Shady Rico', 'Whisper Kev', 'El Gato'
];

const drugData = [
  { id: 'weed', img: 'junkie_weed_0.png' },
  { id: 'meth', img: 'junkie_meth_0.png' },
  { id: 'acid', img: 'junkie_acid_0.png' },
  { id: 'heroin', img: 'junkie_heroin_0.png' },
  { id: 'shrooms', img: 'junkie_shrooms_0.png' },
];

const buyerTiers = {
  'Street Buyer': 1.4,
  'Plug': 1.8,
  'VIP Client': 2.5
};

const npcProfiles = require('./npcProfiles');
const {
    adjustReputation,
    getReputation,
    getReputationRank,
    getReputationFooter,
    updateMood,
    getMood,
    getMoodEffect,
    isBlocked // ✅ should be here
  } = require('./npcReputation');
  

let activeBuyers = new Map();
let buyerLoyalty = new Map();
let privateBuyTimers = new Map();

function getImageURL(file) {
  return `https://raw.githubusercontent.com/martymods/discord-community-bot/main/public/sharedphotos/${file}`;
}

function getLoyaltyKey(userId, npc) {
  return `${userId}_${npc}`;
}

async function spawnBuyer(client) {
    const guild = client.guilds.cache.get('1353730054693064816');
    const channel = guild.channels.cache.find(c => c.name === 'general');
    if (!channel) return;
  
    const npc = npcProfiles[Math.floor(Math.random() * npcProfiles.length)];
    const drug = drugData.find(d => d.id === npc.favorite) || drugData[Math.floor(Math.random() * drugData.length)];
    const tier = Object.keys(buyerTiers)[Math.floor(Math.random() * 3)];
    const quantity = Math.floor(Math.random() * 3) + 1;
  
    let bonus = buyerTiers[tier];
    if (drug.id === npc.favorite) bonus *= 1.2;
    if (drug.id === npc.hate) bonus *= 0.8;
  
    // Phase 8 Mood System
    const mood = getMood(client.user.id, npc.name);
    const moodEffect = getMoodEffect(mood);
    bonus *= moodEffect;
  
    const buyer = {
      name: npc.name,
      tier,
      quantity,
      bonus,
      drug: drug.id
    };
  
    activeBuyers.set(drug.id, buyer);
  
    const embed = new EmbedBuilder()
      .setTitle(`${mood} ${npc.name} wants ${quantity}x ${drug.id.toUpperCase()}`)
      .setDescription(`They’re offering **${Math.floor(bonus * 100)}%** of market value\nTier: **${tier}**\n🧠 ${npc.personality}`)
      .setImage(getImageURL(drug.img))
      .setColor('#ff0000')
      .setFooter({ text: getReputationFooter(client.user.id, npc.name) })
      .setTimestamp();
  
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`npc_sell_${drug.id}`)
        .setLabel(`Sell ${drug.id}`)
        .setStyle(ButtonStyle.Danger)
    );
  
    const sentMsg = await channel.send({ embeds: [embed], components: [row] });
  
    // 🕒 Auto-delete after 65 seconds to prevent spam
    setTimeout(() => {
      sentMsg.delete().catch(() => {});
    }, 65000);
  
    // 🐫 30% chance to spawn a Mule NPC
    const { spawnMule } = require('./npcMules');
    if (Math.random() < 0.3) {
      const users = await guild.members.fetch();
      for (const user of users.values()) {
        if (!user.user.bot) {
          spawnMule(client, user.user, '1353730054693064816'); // hardcoded guild ID
        }
      }
    }
  }
  

async function spawnPrivateBuyer(client, user, buyer) {
  const dm = await user.createDM();
  const mood = getMood(user.id, buyer.name);
  const embed = new EmbedBuilder()
    .setTitle(`${mood} ${buyer.name} DM’d you for ${buyer.quantity}x ${buyer.drug.toUpperCase()}`)
    .setDescription(`They’re still offering **${Math.floor(buyer.bonus * 100)}%** of value. Respond quick.`)
    .setImage(getImageURL(`junkie_${buyer.drug}_0.png`))
    .setColor('#8800ff')
    .setFooter({ text: getReputationFooter(user.id, buyer.name) })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`npc_dm_sell_${buyer.drug}_${buyer.name}`)
      .setLabel(`Sell ${buyer.quantity} ${buyer.drug}`)
      .setStyle(ButtonStyle.Primary)
  );

  await dm.send({ embeds: [embed], components: [row] });

  const loyaltyKey = getLoyaltyKey(user.id, buyer.name);
  const timer = setTimeout(() => {
    privateBuyTimers.delete(loyaltyKey);
  }, 10 * 60 * 1000);

  privateBuyTimers.set(loyaltyKey, timer);
}

async function recordSale(client, userRef, buyer) {
    const actualUserId = typeof userRef === 'string'
      ? userRef
      : userRef?.id || 'UNKNOWN_USER';
  
    console.log(`[RECORD SALE] Called with: userRef=${actualUserId}, buyer=${buyer?.name || 'undefined'}`);
  
    if (!buyer || !buyer.name) {
      console.warn(`[SNITCH BLOCKED] Missing buyer in recordSale for user ID: ${actualUserId}`);
      return;
    }
  
    const key = getLoyaltyKey(actualUserId, buyer.name);
    const current = buyerLoyalty.get(key) || 0;
    buyerLoyalty.set(key, current + 1);
  
    adjustReputation(actualUserId, buyer.name, +1);
    updateMood(actualUserId, buyer.name, +1);
  
    const totalSales = buyerLoyalty.get(key);
    const result = checkSnitchTrigger(actualUserId, totalSales, global.moodMap || new Map(), global.heatMap || new Map());
    
    console.log(`[SNITCH CHECK] ${actualUserId} has ${totalSales} sales. Snitch triggered? ${result?.warned}`);
  
    if (result?.warned) {
      const user = await client.users.fetch(actualUserId).catch(() => null);
      if (user) {
        user.send({ content: result.message, files: [result.profileImage] }).catch(() => {});
        console.log(`[SNITCH WARNING] Sending snitch DM to ${actualUserId}`);
      }
    }
    const channel = client.channels.cache.get('1353730054693064819');
if (channel) {
  const { spawnSnitch } = require('./snitchSpawnLogic');
  spawnSnitch(client, channel, actualUserId);
}

  }
  

function shouldDM(userId, buyer) {
  const key = getLoyaltyKey(userId, buyer.name);
  return buyerLoyalty.get(key) >= 3;
}

function cancelPrivateWindow(userId, buyerName) {
  const key = getLoyaltyKey(userId, buyerName);
  const timer = privateBuyTimers.get(key);
  if (timer) clearTimeout(timer);
  privateBuyTimers.delete(key);
}

function startNPCBuyers(client) {
  setInterval(() => spawnBuyer(client), 60000);
}


module.exports = {
  startNPCBuyers,
  spawnBuyer,
  spawnPrivateBuyer,
  activeBuyers,
  buyerLoyalty,
  recordSale,
  shouldDM,
  cancelPrivateWindow,
  isBlocked // ✅ now safe to export
};
