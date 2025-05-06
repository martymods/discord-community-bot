// utils/safeReply.js
async function safeReply(interaction, content) {
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content, ephemeral: true }).catch(() => {});
      }
    } catch (error) {
      console.error('❌ SafeReply error:', error);
    }
  }
  
  module.exports = { safeReply };
  