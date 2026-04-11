const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'removerole', aliases: ['سحب-رتبة', 'ازالة-رتبة'],
  description: 'سحب رتبة من عضو',
  usage: '!removerole @عضو @رتبة',
  category: '🎭 الرتب',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply('❌ لا تملك صلاحية **إدارة الرتب**.');
    const member = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (!member || !role) return message.reply('❌ `!removerole @عضو @رتبة`');
    if (!member.roles.cache.has(role.id)) return message.reply(`❌ ${member} لا يملك هذه الرتبة.`);
    await member.roles.remove(role);
    const embed = new EmbedBuilder().setColor(config.colors.warning).setTitle('✅ تم سحب الرتبة')
      .addFields(
        { name: 'العضو', value: `${member}`, inline: true },
        { name: 'الرتبة', value: `${role}`, inline: true },
        { name: 'بواسطة', value: `${message.author}`, inline: true },
      ).setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
