const { getJackpotAmount, resetJackpot, setLastWinner } = require('./jackpot');
const { addTokens } = require('./dreamtokens');
const { sendWinDrama } = require('./dramaBetting');

async function maybeTriggerJackpot(client, userId, guildId) {
  const chance = Math.random();
  const jackpot = getJackpotAmount();

  if (chance < 0.02 && jackpot >= 1000) { // 2% chance
    await addTokens(userId, guildId, jackpot);
    setLastWinner(userId);
    resetJackpot();

    const member = await client.users.fetch(userId);
    sendWinDrama(client, userId, jackpot);
    console.log(`🎉 JACKPOT triggered by ${member.username}, won ${jackpot} tokens!`);
  }
}

module.exports = { maybeTriggerJackpot };
