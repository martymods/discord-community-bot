const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  items: { type: Map, of: Number, default: {} }
});

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = {
  Inventory,

  async addItem(userId, guildId, itemName, quantity = 1) {
    let user = await Inventory.findOne({ userId, guildId });
    if (!user) user = await Inventory.create({ userId, guildId });

    user.items.set(itemName, (user.items.get(itemName) || 0) + quantity);
    await user.save();
  },

  async removeItem(userId, guildId, itemName, quantity = 1) {
    const user = await Inventory.findOne({ userId, guildId });
    if (!user) return;

    const current = user.items.get(itemName) || 0;
    if (current <= 0) return;

    user.items.set(itemName, Math.max(0, current - quantity));
    await user.save();
  },

  async getInventory(userId, guildId) {
    let user = await Inventory.findOne({ userId, guildId });
    if (!user) user = await Inventory.create({ userId, guildId });
    return user.items;
  }
};
