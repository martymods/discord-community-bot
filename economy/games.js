module.exports = {
    async flip(message, choice, amount, updateFn) {
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      if (result === choice) {
        await updateFn(amount);
        message.channel.send(`🪙 It was ${result}! You won 💰 $${amount}`);
      } else {
        await updateFn(-amount);
        message.channel.send(`🪙 It was ${result}! You lost 💸 $${amount}`);
      }
    },
  
    async slots(message, amount, balance, updateFn) {
      const emojis = ['🍒', '🍋', '🍊', '🍇', '💎'];
      const spin = () => emojis[Math.floor(Math.random() * emojis.length)];
      const row = [spin(), spin(), spin()];
      const win = row.every(r => r === row[0]);
  
      const payout = win ? amount * 5 : -amount;
      await updateFn(payout);
  
      message.channel.send(`🎰 ${row.join(' | ')}\nYou ${win ? 'won' : 'lost'} ${win ? `$${payout}` : `$${amount}`}`);
    }
  };
  