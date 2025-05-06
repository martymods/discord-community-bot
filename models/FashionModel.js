// 📁 models/FashionModel.js
const mongoose = require('mongoose');

const fashionItemSchema = new mongoose.Schema({
  id: String,               // Unique item ID, e.g., 'fashion_gucci_jacket'
  name: String,             // Display name
  price: Number,            // Purchase price
  brand: String,            // Brand label
  image: String,            // Image URL for embeds
  tryOnUrl: String,         // Optional virtual try-on link
  bonusStat: String,        // e.g., 'agility', 'luck', 'swagger'
  bonusValue: Number        // e.g., 2, 5
});

const fashionSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  items: [fashionItemSchema] // All fashion pieces owned by this user
});

module.exports = mongoose.model('Fashion', fashionSchema);
