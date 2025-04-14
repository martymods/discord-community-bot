<<<<<<< HEAD
const { Purchase } = require('../payments/database');

module.exports = {
  name: 'myorders',
  async execute(message) {
    const purchases = await Purchase.find({ userId: message.author.id });

    if (!purchases.length) return message.reply("You don't have any purchases yet!");

    let list = purchases.map(x => `${x.tier} via ${x.paymentMethod} on ${x.date.toDateString()}`).join('\n');

    message.reply(`Your purchases:\n${list}`);
  }
}
=======
const { Purchase } = require('../payments/database');

module.exports = {
  name: 'myorders',
  async execute(message) {
    const purchases = await Purchase.find({ userId: message.author.id });

    if (!purchases.length) return message.reply("You don't have any purchases yet!");

    let list = purchases.map(x => `${x.tier} via ${x.paymentMethod} on ${x.date.toDateString()}`).join('\n');

    message.reply(`Your purchases:\n${list}`);
  }
}
>>>>>>> e7ad81546eaf32e3ff3aab470666bc16b1cddfb8
