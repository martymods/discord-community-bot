const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  items: { type: Map, of: Number, default: {} }
});

const Inventory = mongoose.model('Inventory', inventorySchema);

async function hasItem(userId, itemName, guildId) {
  const user = await Inventory.findOne({ userId, guildId });
  if (!user || !user.items) return false;

  const count = user.items.get(itemName) || 0;
  return count > 0;
}

module.exports = {
  Inventory,

  async addItem(userId, guildId, itemName, quantity = 1) {
    try {
      let user = await Inventory.findOne({ userId, guildId });
      if (!user) user = await Inventory.create({ userId, guildId });

      const prevQty = user.items.get(itemName) || 0;
      user.items.set(itemName, prevQty + quantity);
      await user.save();

      console.log(`[INVENTORY ADD] ${itemName} +${quantity} for ${userId} (was ${prevQty}, now ${prevQty + quantity})`);
      return true;
    } catch (err) {
      console.error(`[INVENTORY ERROR][ADD] ${err.message}`);
      return false;
    }
  },

  async removeItem(userId, guildId, itemName, quantity = 1) {
    try {
      const user = await Inventory.findOne({ userId, guildId });
      if (!user) {
        console.warn(`[INVENTORY WARN][REMOVE] No user found for ${userId}`);
        return false;
      }

      const current = user.items.get(itemName) || 0;
      if (current <= 0) {
        console.warn(`[INVENTORY WARN][REMOVE] Tried to remove ${itemName} from ${userId} but has none.`);
        return false;
      }

      user.items.set(itemName, Math.max(0, current - quantity));
      await user.save();
      console.log(`[INVENTORY REMOVE] ${itemName} -${quantity} for ${userId} (was ${current}, now ${Math.max(0, current - quantity)})`);
      return true;
    } catch (err) {
      console.error(`[INVENTORY ERROR][REMOVE] ${err.message}`);
      return false;
    }
  },

  async getInventory(userId, guildId) {
    let user = await Inventory.findOne({ userId, guildId });
    if (!user) user = await Inventory.create({ userId, guildId });
    return user.items;
  },

  hasItem // ✅ Exported so it can be used in commands like !lurk
};

