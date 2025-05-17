const { getBalance, removeCash } = require('../economy/currency');
const { getPSN } = require('../systems/psnLinkManager');
const PoolMatch = require('../models/poolMatch');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  name: '2kpool',
  async execute(message, args) {
    const bet = parseInt(args[0]);
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (isNaN(bet) || bet <= 0) return message.reply('⚠️ Enter a valid DreamToken amount.');

    const psn = await getPSN(userId, guildId);
    if (!psn) return message.reply('🎮 You must link a PSN using `!linkpsn` before entering the pool.');

    const balance = await getBalance(userId, guildId);
    if (balance < bet) return message.reply('💸 Not enough DreamTokens.');

    await removeCash(userId, guildId, bet);

    let pool = await PoolMatch.findOne({ guildId, status: 'open', matched: false });

    if (!pool) {
      pool = await PoolMatch.create({
        poolId: uuidv4(),
        guildId,
        players: [userId],
        bets: new Map([[userId, bet]]),
        matched: false,
        rake: 0.1
      });
      return message.reply(`🎲 You've entered a new NBA2K wager pool for **${bet} DreamTokens**. Waiting for an opponent...`);
    }

    // Add to existing pool
    pool.players.push(userId);
    pool.bets.set(userId, bet);
    pool.matched = true;
    pool.status = 'matched';
    await pool.save();

    return message.channel.send(
      `🔥 Match Found: <@${pool.players[0]}> vs <@${pool.players[1]}>\n` +
      `💰 Pot: ${bet * 2} DreamTokens\n📡 Waiting for result...`
    );
  }
};
 