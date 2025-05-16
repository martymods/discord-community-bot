const { checkAndResolveAllMatches } = require('../systems/matchResolver');

function startMatchVerificationInterval(intervalMs = 300000) { // default: 5 min
  setInterval(async () => {
    console.log("🔄 Checking unresolved NBA2K matches...");
    await checkAndResolveAllMatches();
  }, intervalMs);
}

module.exports = { startMatchVerificationInterval };
 