const Property = require('../economy/propertyModel');
const { addCash, getBalance } = require('../economy/currency');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  async execute(message) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply("⛔ Only server admins can run this.");
    }

    const allProps = await Property.find({ ownerId: { $ne: null } });

    if (!allProps.length) {
      return message.reply("📭 No business owners to pay out.");
    }

    const payouts = new Map();

    for (const prop of allProps) {
      const payout = prop.payoutPerHour || 0;
      if (!payout || payout <= 0) {
        console.log(`⚠️ SKIPPED: ${prop.name} (${prop.id}) — Invalid payout`);
        continue;
      }

      const data = payouts.get(prop.ownerId) || { total: 0, businesses: [] };
      data.total += payout;
      data.businesses.push({ name: prop.name || prop.id, payout });
      payouts.set(prop.ownerId, data);
    }

    const results = [];

    for (const [userId, { total, businesses }] of payouts.entries()) {
      const user = await message.guild.members.fetch(userId).catch(() => null);
      if (!user) {
        console.log(`❌ Could not fetch user ${userId}`);
        continue;
      }

      const oldBalance = await getBalance(userId, message.guild.id);
      await addCash(userId, message.guild.id, total);
      const newBalance = await getBalance(userId, message.guild.id);

      console.log(`✅ Payout for ${user.user.tag} (${userId})`);
      console.log(`→ Starting Balance: $${oldBalance.toLocaleString()}`);
      businesses.forEach(b => {
        console.log(`🏢 ${b.name}: +$${b.payout.toLocaleString()}`);
      });
      console.log(`→ Total Paid: $${total.toLocaleString()}`);
      console.log(`→ New Balance: $${newBalance.toLocaleString()}`);
      console.log('---');

      try {
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("💰 Daily Business Income")
              .setDescription(`You earned **$${total.toLocaleString()}** from ${businesses.length} business${businesses.length > 1 ? 'es' : ''}.`)
              .addFields(
                businesses.map(biz => ({
                  name: biz.name,
                  value: `💸 $${biz.payout.toLocaleString()}`,
                  inline: true
                }))
              )
              .setColor("#33cc99")
              .setFooter({ text: "Dreamworld Payout Engine" })
          ]
        });
      } catch (err) {
        console.log(`📪 Failed to DM ${user.user.tag}: ${err.message}`);
      }

      results.push({
        name: user.user.username,
        amount: total,
        count: businesses.length
      });
    }

    // 📊 Post to #bank
    const summaryEmbed = new EmbedBuilder()
      .setTitle("🏦 Business Payout Report")
      .setDescription("Today's payouts from owned businesses:")
      .addFields(
        results.map(r => ({
          name: `👤 ${r.name}`,
          value: `🏢 ${r.count} businesses\n💸 $${r.amount.toLocaleString()}`,
          inline: false
        }))
      )
      .setColor("#ffaa00")
      .setFooter({ text: "Manual payout triggered by admin" });

    const bankChannel = message.guild.channels.cache.find(c => c.name === 'bank');
    if (bankChannel) {
      bankChannel.send({ embeds: [summaryEmbed] });
    }

    message.reply("✅ Payouts complete. Logs printed to console. Summary posted to #bank.");
  }
};
