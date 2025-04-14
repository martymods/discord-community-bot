async function giveRole(guild, userId, roleId) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await member.roles.add(roleId).catch(() => {});
  }
  
  async function removeRole(guild, userId, roleId) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await member.roles.remove(roleId).catch(() => {});
  }
  
  module.exports = { giveRole, removeRole };
  