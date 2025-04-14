const Levels = require("discord-xp");

const levelRoles = {
  5: 'ROLE_ID_HUSTLER',
  10: 'ROLE_ID_GRINDER',
  20: 'ROLE_ID_PLUG',
  30: 'ROLE_ID_BOSS',
  40: 'ROLE_ID_DON',
  50: 'ROLE_ID_LEGEND'
};

module.exports = async function checkLevelReward(message) {
  const user = await Levels.fetch(message.author.id, message.guild.id);
  if (!user) return;

  const level = user.level;
  const guild = message.guild;
  const member = await guild.members.fetch(message.author.id);

  if (levelRoles[level]) {
    const roleId = levelRoles[level];
    if (!member.roles.cache.has(roleId)) {
      await member.roles.add(roleId);
      message.channel.send(`🎉 Congrats <@${member.id}>, you reached level ${level} and earned a new role!`);
    }
  }
};
