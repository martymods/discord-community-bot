const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.channel.send('🏓 Pong!');
  }

  if (message.content === '!help') {
    message.channel.send('Available commands: `!ping`, `!help`, `!kick @user`, `!ban @user`');
  }
});

client.on('guildMemberAdd', member => {
  const channel = member.guild.systemChannel;
  if (channel) {
    channel.send(`👋 Welcome to the server, ${member.user.tag}!`);
  }
});

client.login(process.env.DISCORD_TOKEN);
