// /api/newReferral.js
const express = require('express');
const router = express.Router();
const { registerReferral } = require('../utils/registerReferral');

router.post('/', async (req, res) => {
  const { referral, discordUser, guildId } = req.body;

  if (!referral || !discordUser || !guildId) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const success = await registerReferral(referral, discordUser, guildId);
  res.json({ success });
});

module.exports = router;
