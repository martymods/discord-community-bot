const { addCash } = require('../economy/currency');
const { removeItem, getInventory } = require('../economy/inventory');

async function sellToNpcDealer(userId, guildId, drugId) {
  const inventory = await getInventory(userId, guildId);
  const qty = inventory.get(drugId) || 0;

  if (qty <= 0) {
    throw new Error('No items to sell');
  }

  const payout = Math.floor(Math.random() * 250) + 100;

  await removeItem(userId, guildId, drugId, 1);
  await addCash(userId, guildId, payout);

  return payout;
}

module.exports = { sellToNpcDealer };
