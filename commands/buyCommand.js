module.exports = {
    name: 'buy',
    execute(message) {
      message.channel.send(`Ready to level up?
  Choose your payment method:
  
  💳 Stripe → https://your-stripe-checkout-link.com  
  💰 PayPal → https://your-paypal-checkout-link.com`);
    }
  }
  