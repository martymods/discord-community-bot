const p2p = new Map();

module.exports = {
  p2p,

  createChallenge(message, opponentId, amount) {
    const key = `${message.author.id}-${opponentId}`;
    p2p.set(key, { challenger: message.author.id, opponent: opponentId, amount });
    return `💢 <@${message.author.id}> challenged <@${opponentId}> to a 1v1 for ${amount} DreamTokens!
<@${opponentId}>, type \`!accept ${message.author.id}\` to fight.`;
  },

  async acceptChallenge(client, message, challengerId) {
    const key = `${challengerId}-${message.author.id}`;
    const bet = p2p.get(key);
    if (!bet) return message.reply("No pending challenge found.");

    // Coin flip
    const winner = Math.random() < 0.5 ? challengerId : message.author.id;
    const loser = winner === challengerId ? message.author.id : challengerId;

    const { removeTokens, addTokens } = require('./dreamtokens');
    await removeTokens(challengerId, message.guild.id, bet.amount);
    await removeTokens(message.author.id, message.guild.id, bet.amount);
    await addTokens(winner, message.guild.id, bet.amount * 2);

    p2p.delete(key);

    return `⚔️ **1v1 Battle Result**  
<@${challengerId}> vs <@${message.author.id}>  
🎉 Winner: <@${winner}> (+${bet.amount * 2} DreamTokens)`;
  }
};
