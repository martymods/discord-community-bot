const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  number: Number,
  purchasedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
