module.exports = {
    name: 'buy',
    execute(message) {
        message.channel.send(`Ready to level up?
            Choose your payment method:
            
            💳 Hustler → https://buy.stripe.com/test_cN2eY3f2C9yef9S4gg
            💳 Hustler (Paypal) → https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=P46V85P96PFN4

            💳 Grinder → https://buy.stripe.com/test_28o7vB3jU11I8Lu145

            💳 Plug → https://buy.stripe.com/test_4gw3fl07IdOu1j2fZ0
            💳 Plug (Paypal) → https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=Z55AT22CFFY3E

            💳 Boss → https://buy.stripe.com/test_dR63fl4nYh0G7HqfZ1

            💳 Don → https://buy.stripe.com/test_28o9DJ6w625MbXG6os
            💳 Don (Paypal) → https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=29YASXWWDTVJL

            💳 Legend → https://buy.stripe.com/test_aEU5nt1bM7q65zi6ot
            `);
            
    }
  }