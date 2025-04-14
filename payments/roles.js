<<<<<<< HEAD
async function giveRole(guild, userId, roleId) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await member.roles.add(roleId).catch(() => {});
  }
  
  async function removeRole(guild, userId, roleId) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await member.roles.remove(roleId).catch(() => {});
  }
  
  module.exports = { giveRole, removeRole };
=======
async function giveRole(guild, userId, roleId) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await member.roles.add(roleId).catch(() => {});
  }
  
  async function removeRole(guild, userId, roleId) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await member.roles.remove(roleId).catch(() => {});
  }
  
  module.exports = { giveRole, removeRole };
>>>>>>> e7ad81546eaf32e3ff3aab470666bc16b1cddfb8
  