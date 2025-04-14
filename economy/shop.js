const { items } = require('./items');

let rotatingShop = [];

function refreshShop() {
  rotatingShop = items.filter(() => Math.random() < 0.4); // 40% chance to appear in today's shop
}

refreshShop(); // Initial load

setInterval(refreshShop, 1000 * 60 * 60 * 24); // Refresh every 24 hours

module.exports = {
  rotatingShop,
  refreshShop
};
