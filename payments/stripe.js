const Stripe = require('stripe');
const express = require('express');
const { Purchase } = require('./database');
const { giveRole, removeRole } = require('./roles');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const router = express.Router();

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const guild = global.client.guilds.cache.get(process.env.GUILD_ID);

    const tier = session.metadata.tier;
    const userId = session.metadata.userId;
    const username = session.metadata.username;

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
      paymentMethod: 'Stripe'
    });

    if (tier === 'Don' || tier === 'Legend') {
      const channel = guild.systemChannel;
      if (channel) channel.send(`💸 ${username} just became ${tier}! Respect the grind!`);
    }
  }

  res.json({ received: true });
});

module.exports = router;
