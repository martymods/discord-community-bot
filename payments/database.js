const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  userId: String,
  username: String,
  tier: String,
  paymentMethod: String,
  date: { type: Date, default: Date.now }
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = { Purchase };
