
const express = require('express');
const { Purchase } = require('./database');
const { giveRole } = require('./roles');

const router = express.Router();

router.post('/paypal/webhook', express.json(), async (req, res) => {
  const event = req.body;

  if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
    const resource = event.resource;
    const tier = resource.custom;
    const userId = resource.invoice_number;
    const username = resource.payer.payer_info.payer_id;

    const guild = global.client.guilds.cache.get(process.env.GUILD_ID);

    const roleIds = {
      Hustler: 'ROLE_ID_1',
      Grinder: 'ROLE_ID_2',
      Plug: 'ROLE_ID_3',
      Boss: 'ROLE_ID_4',
      Don: 'ROLE_ID_5',
      Legend: 'ROLE_ID_6'
    };

    await giveRole(guild, userId, roleIds[tier]);

    await Purchase.create({
      userId,
      username,
      tier,
      paymentMethod: 'PayPal'
    });

    if (tier === 'Don' || tier === 'Legend') {
      const channel = guild.systemChannel;
      if (channel) channel.send(`💸 ${username} just became ${tier}! Big respect!`);
    }
  }

  res.status(200).send('OK');
});

module.exports = router;

