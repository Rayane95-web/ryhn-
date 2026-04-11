const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'removeallroles', aliases: ['ازالة-كل-الرتب', 'مسح-رتب'],
  description: 'إزالة كل الرتب من عضو',
  usage: '!removeallroles @عضو',
  category: '🎭 الرتب',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply('❌ لا تملك صلاحية **إدارة الرتب**.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('❌ `!removeallroles @عضو`');
    const roles = member.roles.cache.filter(r => r.id !== message.guild.id && r.position < message.guild.members.me.roles.highest.position);
    await member.roles.remove(roles);
    const embed = new EmbedBuilder().setColor(config.colors.danger).setTitle('✅ تم إزالة كل الرتب')
      .addFields(
        { name: 'العضو', value: `${member}`, inline: true },
        { name: 'الرتب المُزالة', value: `${roles.size}`, inline: true },
        { name: 'بواسطة', value: `${message.author}`, inline: true },
      ).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
