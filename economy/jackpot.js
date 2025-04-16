let jackpotPool = 0;
let lastWinner = null;

function addToJackpot(amount) {
  const cut = Math.floor(amount * 0.05); // 5%
  jackpotPool += cut;
  return cut;
}

function getJackpotAmount() {
  return jackpotPool;
}

function resetJackpot() {
  jackpotPool = 0;
}

function setLastWinner(userId) {
  lastWinner = userId;
}

function getLastWinner() {
  return lastWinner;
}

module.exports = {
  addToJackpot,
  getJackpotAmount,
  resetJackpot,
  setLastWinner,
  getLastWinner
};
