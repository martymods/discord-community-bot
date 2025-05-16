// inside server.js or your main Express app
const express = require('express');
const { registerReferral } = require('./utils/registerReferral');
const app = express();

app.use(express.json());

app.post('/api/newReferral', async (req, res) => {
  const { referral, discordUser, guildId } = req.body;

  if (!referral || !discordUser || !guildId) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const success = await registerReferral(referral, discordUser, guildId);
  res.json({ success });
});
